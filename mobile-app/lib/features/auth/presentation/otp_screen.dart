import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/primary_button.dart';

/// Mirrors src/screens/AuthScreen.tsx's OTP step: 6 single-digit boxes,
/// 60s resend cooldown, and — only for purpose=forgot_password — a new
/// password + confirm field, since server.ts's verify-otp only issues a
/// session token for purpose=register (forgot-password goes through
/// reset-password instead, see AuthRepository.verifyOtp/resetPassword).
class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key, required this.email, required this.purpose});

  final String email;
  final String purpose;

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _digitControllers = List.generate(6, (_) => TextEditingController());
  final _digitFocus = List.generate(6, (_) => FocusNode());
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();

  Timer? _timer;
  int _cooldown = 60;
  bool _loading = false;
  bool _resending = false;
  String? _error;
  String? _message;

  @override
  void initState() {
    super.initState();
    _message = ref.read(stringsProvider).otpSentMessage;
    _startCooldown();
  }

  void _startCooldown() {
    _timer?.cancel();
    setState(() => _cooldown = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_cooldown <= 0) {
        t.cancel();
        return;
      }
      setState(() => _cooldown--);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in _digitControllers) {
      c.dispose();
    }
    for (final f in _digitFocus) {
      f.dispose();
    }
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  String get _code => _digitControllers.map((c) => c.text).join();

  Future<void> _verify() async {
    final strings = ref.read(stringsProvider);
    setState(() {
      _error = null;
      _message = null;
    });

    if (_code.length != 6) {
      setState(() => _error = strings.otpIncomplete);
      return;
    }

    final repo = ref.read(authRepositoryProvider);
    setState(() => _loading = true);
    try {
      if (widget.purpose == 'register') {
        final res = await repo.verifyOtp(email: widget.email, otp: _code, purpose: 'register');
        await ref.read(authProvider.notifier).applyAuthResponse(res!);
        if (!mounted) return;
        context.go('/home');
        return;
      }

      if (_newPassword.text.length < 6) {
        setState(() => _error = strings.passwordTooShort);
        return;
      }
      if (_newPassword.text != _confirmPassword.text) {
        setState(() => _error = strings.passwordsDoNotMatch);
        return;
      }
      await repo.resetPassword(email: widget.email, otp: _code, password: _newPassword.text);
      if (!mounted) return;
      setState(() => _message = strings.passwordResetSuccess);
      await Future.delayed(const Duration(milliseconds: 900));
      if (mounted) context.go('/login');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    if (_cooldown > 0 || _resending) return;
    final strings = ref.read(stringsProvider);
    setState(() {
      _error = null;
      _message = null;
      _resending = true;
    });
    try {
      await ref.read(authRepositoryProvider).resendOtp(widget.email, widget.purpose);
      setState(() => _message = strings.otpResentMessage);
      _startCooldown();
      for (final c in _digitControllers) {
        c.clear();
      }
      _digitFocus.first.requestFocus();
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        if (e.cooldownSeconds != null) _cooldown = e.cooldownSeconds!;
      });
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(strings.verifyEmailTitle,
                  style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
              const SizedBox(height: 8),
              RichText(
                text: TextSpan(
                  style: const TextStyle(color: AppColors.gray500, fontWeight: FontWeight.w500, fontSize: 14),
                  children: [
                    TextSpan(text: '${strings.otpSentTo} '),
                    TextSpan(
                      text: widget.email,
                      style: const TextStyle(color: AppColors.gray900, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              Directionality(
                textDirection: TextDirection.ltr,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: List.generate(6, (i) {
                    return SizedBox(
                      width: 44,
                      height: 56,
                      child: TextField(
                        controller: _digitControllers[i],
                        focusNode: _digitFocus[i],
                        textAlign: TextAlign.center,
                        keyboardType: TextInputType.number,
                        maxLength: 1,
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        decoration: const InputDecoration(counterText: ''),
                        onChanged: (value) {
                          if (value.isNotEmpty && i < 5) {
                            _digitFocus[i + 1].requestFocus();
                          } else if (value.isEmpty && i > 0) {
                            _digitFocus[i - 1].requestFocus();
                          }
                        },
                      ),
                    );
                  }),
                ),
              ),
              if (widget.purpose == 'forgot_password') ...[
                const SizedBox(height: 16),
                TextField(
                  controller: _newPassword,
                  obscureText: true,
                  decoration: InputDecoration(hintText: strings.newPassword),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _confirmPassword,
                  obscureText: true,
                  decoration: InputDecoration(hintText: strings.confirmPassword),
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
                label: _loading ? strings.processing : strings.verifyCode,
                loading: _loading,
                onPressed: _verify,
                icon: Icons.arrow_forward_rounded,
              ),
              const SizedBox(height: 24),
              Center(
                child: Column(
                  children: [
                    TextButton(
                      onPressed: _cooldown > 0 || _resending ? null : _resend,
                      child: Text(
                        _resending
                            ? strings.processing
                            : _cooldown > 0
                                ? '${strings.resendCodeIn} ${_cooldown}s'
                                : strings.resendCode,
                      ),
                    ),
                    TextButton(
                      onPressed: () => context.go('/login'),
                      child: Text(strings.backToLogin),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
