import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/phone_utils.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/primary_button.dart';

enum _AuthMode { login, register, forgotPassword }

/// Mirrors src/screens/AuthScreen.tsx: single screen toggling between
/// login / register / forgot-password, rounded-2xl gray inputs, black CTA.
///
/// KNOWN GAP vs. the website: AuthScreen.tsx renders a Google reCAPTCHA v2
/// checkbox and blocks submit without it. That widget is web-only; a
/// native mobile equivalent needs either reCAPTCHA Enterprise's Android
/// SDK or a WebView (ruled out for this app). server.ts only enforces the
/// captcha when `RECAPTCHA_SECRET` is set in the environment (see
/// server.ts:1495 / :1716) — this screen omits `captchaToken` entirely, so
/// it works as-is against any deployment that leaves that unset, and will
/// need the above decision made before shipping against one that doesn't.
class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _formKey = GlobalKey<FormState>();

  _AuthMode _mode = _AuthMode.login;
  String _role = 'user';

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _phone = TextEditingController();
  final _whatsapp = TextEditingController();
  final _branches = TextEditingController(text: '1');
  final _address = TextEditingController();

  String? _error;
  String? _message;
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    _phone.dispose();
    _whatsapp.dispose();
    _branches.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final strings = ref.read(stringsProvider);
    setState(() {
      _error = null;
      _message = null;
    });

    if (_mode == _AuthMode.register) {
      if (_password.text.length < 6) {
        setState(() => _error = strings.passwordTooShort);
        return;
      }
      if (_password.text != _confirmPassword.text) {
        setState(() => _error = strings.passwordsDoNotMatch);
        return;
      }
      if (_role == 'dealer' &&
          (!isValidEgyptLocalPhone(_phone.text) || !isValidEgyptLocalPhone(_whatsapp.text))) {
        setState(() => _error =
            'Please enter your phone number without the leading zero and without the country code.');
        return;
      }
    }

    setState(() => _loading = true);
    final repo = ref.read(authRepositoryProvider);
    try {
      if (_mode == _AuthMode.forgotPassword) {
        await repo.forgotPassword(_email.text.trim());
        if (!mounted) return;
        context.push('/otp?email=${Uri.encodeComponent(_email.text.trim())}&purpose=forgot_password');
        return;
      }

      if (_mode == _AuthMode.login) {
        final res = await repo.login(email: _email.text.trim(), password: _password.text);
        await ref.read(authProvider.notifier).applyAuthResponse(res);
        if (!mounted) return;
        context.go('/home');
        return;
      }

      final result = await repo.register(
        email: _email.text.trim(),
        password: _password.text,
        name: _name.text.trim(),
        role: _role,
        extra: _role == 'dealer'
            ? {
                'phone': toEgyptE164(_phone.text),
                'whatsapp_number': toEgyptE164(_whatsapp.text),
                'branches_count': int.tryParse(_branches.text) ?? 1,
                'address': _address.text.trim(),
              }
            : const {},
      );
      if (!mounted) return;
      context.push('/otp?email=${Uri.encodeComponent(result.email)}&purpose=register');
    } on ApiException catch (e) {
      if (e.requiresOtpVerification && e.email != null) {
        if (!mounted) return;
        context.push('/otp?email=${Uri.encodeComponent(e.email!)}&purpose=register');
        return;
      }
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final lang = ref.watch(languageProvider);
    final isAr = lang.name == 'ar';

    final title = _mode == _AuthMode.forgotPassword
        ? (isAr ? 'نسيت كلمة المرور' : 'Forgot Password')
        : _mode == _AuthMode.login
            ? strings.welcomeBack
            : strings.createAccount;
    final subtitle = _mode == _AuthMode.forgotPassword
        ? (isAr ? 'أدخل بريدك الإلكتروني لاستلام رمز التحقق' : 'Enter your email to receive a verification code')
        : _mode == _AuthMode.login
            ? strings.signInToContinue
            : strings.joinExclusive;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                const SizedBox(height: 8),
                Text(subtitle, style: const TextStyle(color: AppColors.gray500, fontWeight: FontWeight.w500)),
                const SizedBox(height: 32),
                if (_mode == _AuthMode.register) ...[
                  TextField(controller: _name, decoration: InputDecoration(hintText: strings.fullName)),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(hintText: strings.emailAddress),
                ),
                if (_mode != _AuthMode.forgotPassword) ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: _password,
                    obscureText: true,
                    decoration: InputDecoration(hintText: strings.password),
                  ),
                ],
                if (_mode == _AuthMode.register) ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: _confirmPassword,
                    obscureText: true,
                    decoration: InputDecoration(hintText: strings.confirmPassword),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: _RoleChip(
                        label: strings.userRole,
                        selected: _role == 'user',
                        onTap: () => setState(() => _role = 'user'),
                      )),
                      const SizedBox(width: 12),
                      Expanded(child: _RoleChip(
                        label: strings.dealerRole,
                        selected: _role == 'dealer',
                        onTap: () => setState(() => _role = 'dealer'),
                      )),
                    ],
                  ),
                  if (_role == 'dealer') ...[
                    const SizedBox(height: 16),
                    TextField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(prefixText: '+20  ', hintText: '1155336849'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _whatsapp,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(prefixText: '+20  ', hintText: '1155336849'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _branches,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(hintText: isAr ? 'عدد الفروع' : 'Number of branches'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _address,
                      decoration: InputDecoration(hintText: isAr ? 'العنوان' : 'Address'),
                    ),
                  ],
                ],
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(_error!, style: const TextStyle(color: AppColors.red500, fontWeight: FontWeight.w700, fontSize: 12)),
                ],
                if (_message != null) ...[
                  const SizedBox(height: 16),
                  Text(_message!, style: const TextStyle(color: AppColors.emerald500, fontWeight: FontWeight.w700, fontSize: 12)),
                ],
                const SizedBox(height: 24),
                PrimaryButton(
                  label: _loading
                      ? strings.processing
                      : _mode == _AuthMode.forgotPassword
                          ? strings.sendCode
                          : _mode == _AuthMode.login
                              ? strings.signIn
                              : strings.register,
                  loading: _loading,
                  onPressed: _submit,
                  icon: Icons.arrow_forward_rounded,
                ),
                const SizedBox(height: 24),
                Center(
                  child: Column(
                    children: [
                      if (_mode == _AuthMode.login)
                        TextButton(
                          onPressed: () => setState(() => _mode = _AuthMode.forgotPassword),
                          child: Text(strings.forgotPassword),
                        ),
                      if (_mode == _AuthMode.forgotPassword)
                        TextButton(
                          onPressed: () => setState(() => _mode = _AuthMode.login),
                          child: Text(strings.backToSignIn),
                        ),
                      if (_mode != _AuthMode.forgotPassword)
                        TextButton(
                          onPressed: () => setState(() {
                            _mode = _mode == _AuthMode.login ? _AuthMode.register : _AuthMode.login;
                            _error = null;
                            _message = null;
                          }),
                          child: Text(_mode == _AuthMode.login ? strings.createAccount : strings.signIn),
                        ),
                      if (_mode == _AuthMode.login)
                        TextButton(
                          onPressed: () => context.go('/home'),
                          child: Text(isAr ? 'تصفح بدون تسجيل' : 'Continue as guest'),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RoleChip extends StatelessWidget {
  const _RoleChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? AppColors.black : AppColors.gray50,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: selected ? AppColors.black : AppColors.gray100),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? AppColors.white : AppColors.gray400,
            fontWeight: FontWeight.w700,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}
