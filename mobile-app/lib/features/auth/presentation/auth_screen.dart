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
import '../../../core/network/error_text.dart';
import '../../../core/l10n/market_strings.dart';
import '../../dealers/presentation/manage/dealer_widgets.dart' show LabeledDropdown;
import '../../../core/l10n/app_strings.dart';

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
/// The required "I accept the Terms of Use and Privacy Policy" line of the
/// sign-up form, with links to both pages (Google Play's user-generated
/// content policy). The links open the in-app pages without accepting.
class _TermsAcceptance extends StatelessWidget {
  const _TermsAcceptance({required this.accepted, required this.strings, required this.onChanged});

  final bool accepted;
  final AppStrings strings;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    const plain = TextStyle(fontSize: 13, height: 1.5, color: AppColors.gray600);
    const link = TextStyle(fontSize: 13, height: 1.5, fontWeight: FontWeight.w800, color: AppColors.gray900, decoration: TextDecoration.underline);
    final sentence = '${strings.acceptTermsPrefix} ${strings.termsOfUseLink} ${strings.termsAnd} ${strings.privacyPolicyLink}';
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          label: sentence,
          child: SizedBox(
            width: 24,
            height: 24,
            child: Checkbox(
              key: const Key('accept-terms'),
              value: accepted,
              activeColor: AppColors.emeraldAccent,
              onChanged: (value) => onChanged(value ?? false),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Wrap(
            spacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              GestureDetector(onTap: () => onChanged(!accepted), child: Text(strings.acceptTermsPrefix, style: plain)),
              InkWell(key: const Key('open-terms'), onTap: () => context.push('/terms'), child: Text(strings.termsOfUseLink, style: link)),
              Text(strings.termsAnd, style: plain),
              InkWell(key: const Key('open-privacy'), onTap: () => context.push('/privacy'), child: Text(strings.privacyPolicyLink, style: link)),
            ],
          ),
        ),
      ],
    );
  }
}

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _formKey = GlobalKey<FormState>();

  _AuthMode _mode = _AuthMode.login;
  String _role = 'user';
  // Dealer sign-up, as on the site: cars or parts; car dealers also pick a
  // category (POST /api/auth/register business_type / dealer_category).
  String _businessType = 'car_dealer';
  String _dealerCategory = 'single';
  // Unchecked by default; only a deliberate tick counts as acceptance.
  bool _acceptedTerms = false;

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

    if (_email.text.trim().isEmpty) {
      setState(() => _error = strings.emailRequired);
      return;
    }
    if (_mode != _AuthMode.forgotPassword && _password.text.isEmpty) {
      setState(() => _error = strings.passwordRequired);
      return;
    }
    if (_mode == _AuthMode.register) {
      if (_name.text.trim().isEmpty) {
        setState(() => _error = strings.nameRequired);
        return;
      }
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
        setState(() => _error = strings.phoneFormatError);
        return;
      }
      if (!_acceptedTerms) {
        setState(() => _error = strings.termsRequired);
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
        acceptTerms: _acceptedTerms,
        extra: _role == 'dealer'
            ? {
                'phone': toEgyptE164(_phone.text),
                'whatsapp_number': toEgyptE164(_whatsapp.text),
                'branches_count': int.tryParse(_branches.text) ?? 1,
                'address': _address.text.trim(),
                'business_type': _businessType,
                if (_businessType == 'car_dealer') 'dealer_category': _dealerCategory,
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
      setState(() => _error = errorMessage(e, ref.read(stringsProvider)));
    } catch (e) {
      setState(() => _error = errorMessage(e, ref.read(stringsProvider)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);

    final title = _mode == _AuthMode.forgotPassword
        ? strings.forgotPasswordTitle
        : _mode == _AuthMode.login
            ? strings.welcomeBack
            : strings.createAccount;
    final subtitle = _mode == _AuthMode.forgotPassword
        ? strings.forgotPasswordSubtitle
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
                    Text(strings.businessType, style: const TextStyle(color: AppColors.gray500, fontWeight: FontWeight.w700, fontSize: 12)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(child: _RoleChip(
                          key: const Key('business-car'),
                          label: strings.carDealerType,
                          selected: _businessType == 'car_dealer',
                          onTap: () => setState(() => _businessType = 'car_dealer'),
                        )),
                        const SizedBox(width: 12),
                        Expanded(child: _RoleChip(
                          key: const Key('business-parts'),
                          label: strings.partsDealerType,
                          selected: _businessType == 'parts_dealer',
                          onTap: () => setState(() => _businessType = 'parts_dealer'),
                        )),
                      ],
                    ),
                    if (_businessType == 'car_dealer')
                      LabeledDropdown(
                        key: const Key('dealer-category'),
                        label: strings.dealerCategory,
                        value: _dealerCategory,
                        items: {
                          for (final c in const ['single', 'multi_branch', 'chain', 'importer', 'official_agent'])
                            c: strings.dealerCategoryLabel(c),
                        },
                        onChanged: (v) => setState(() => _dealerCategory = v),
                      ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(labelText: strings.phoneLabel, prefixText: '+20  ', hintText: '1155336849'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _whatsapp,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(labelText: strings.whatsappLabel, prefixText: '+20  ', hintText: '1155336849'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _branches,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(hintText: strings.branchesLabel),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _address,
                      decoration: InputDecoration(hintText: strings.addressLabel),
                    ),
                  ],
                ],
                if (_mode == _AuthMode.register) ...[
                  const SizedBox(height: 16),
                  _TermsAcceptance(
                    accepted: _acceptedTerms,
                    strings: strings,
                    onChanged: (value) => setState(() => _acceptedTerms = value),
                  ),
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
                          child: Text(strings.continueAsGuest),
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
  const _RoleChip({super.key, required this.label, required this.selected, required this.onTap});

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
