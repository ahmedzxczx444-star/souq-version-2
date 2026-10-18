import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/l10n/moderation_strings.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/web_layout.dart';
import '../../../core/network/error_text.dart';

/// Mirrors src/screens/SettingsScreen.tsx (language) and
/// src/screens/PrivacySecurityScreen.tsx (change password, log out of all
/// devices), plus account deletion and the legal pages the stores require
/// to be reachable from inside the app.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final user = ref.watch(authProvider).valueOrNull;

    void toast(String message) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    }

    Future<void> changePassword() async {
      final done = await showDialog<bool>(context: context, builder: (_) => const _ChangePasswordDialog());
      if (done == true && context.mounted) toast(strings.passwordChanged);
    }

    Future<void> logoutAll() async {
      final ok = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text(strings.logoutAll),
          content: Text(strings.logoutAllBody),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: Text(strings.cancel)),
            TextButton(onPressed: () => Navigator.pop(dialogContext, true), child: Text(strings.confirm)),
          ],
        ),
      );
      if (ok != true) return;
      try {
        await ref.read(authRepositoryProvider).logoutAll();
        await ref.read(authProvider.notifier).logout();
        if (context.mounted) context.go('/login');
      } on ApiException catch (e) {
        if (context.mounted) toast(errorMessage(e, ref.read(stringsProvider)));
      }
    }

    Future<void> deleteAccount() async {
      final deleted = await showDialog<bool>(context: context, builder: (_) => const _DeleteAccountDialog());
      if (deleted != true) return;
      await ref.read(authProvider.notifier).logout();
      if (!context.mounted) return;
      toast(strings.accountDeleted);
      context.go('/home');
    }

    return Scaffold(
      backgroundColor: AppColors.white,
      body: SafeArea(
        child: WebColumn(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Row(
                children: [
                  WebBackButton(onTap: () => context.canPop() ? context.pop() : context.go('/home')),
                  const SizedBox(width: 16),
                  Text(
                    strings.settings,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: -0.6, color: AppColors.gray900),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              _SettingsTile(
                key: const Key('settings-language'),
                icon: Icons.language_rounded,
                label: strings.language,
                value: strings.currentLanguage,
                onTap: () => ref.read(languageProvider.notifier).toggle(),
              ),
              _SectionLabel(strings.account),
              if (user == null)
                _SettingsTile(
                  key: const Key('settings-sign-in'),
                  icon: Icons.login_rounded,
                  label: strings.signInToManage,
                  onTap: () => context.go('/login'),
                )
              else ...[
                _SettingsTile(
                  key: const Key('settings-change-password'),
                  icon: Icons.lock_outline_rounded,
                  label: strings.changePassword,
                  onTap: changePassword,
                ),
                _SettingsTile(
                  key: const Key('settings-logout-all'),
                  icon: Icons.devices_other_rounded,
                  label: strings.logoutAll,
                  onTap: logoutAll,
                ),
                _SettingsTile(
                  key: const Key('settings-blocked'),
                  icon: Icons.block_rounded,
                  label: strings.blockedAccounts,
                  onTap: () => context.push('/blocked-accounts'),
                ),
                _SettingsTile(
                  key: const Key('settings-delete-account'),
                  icon: Icons.delete_outline_rounded,
                  label: strings.deleteAccount,
                  color: AppColors.red500,
                  onTap: deleteAccount,
                ),
              ],
              _SectionLabel(strings.legal),
              _SettingsTile(icon: Icons.description_outlined, label: strings.terms, onTap: () => context.push('/terms')),
              _SettingsTile(
                key: const Key('settings-privacy'),
                icon: Icons.shield_outlined,
                label: strings.privacyPolicy,
                onTap: () => context.push('/privacy'),
              ),
              _SettingsTile(icon: Icons.support_agent_rounded, label: strings.contactUs, onTap: () => context.push('/contact')),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 24, bottom: 12),
      child: Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.gray400)),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.value,
    this.color = AppColors.gray900,
  });

  final IconData icon;
  final String label;
  final String? value;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppColors.gray50,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Row(
              children: [
                Icon(icon, color: color, size: 22),
                const SizedBox(width: 16),
                Expanded(child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 15))),
                if (value != null)
                  Padding(
                    padding: const EdgeInsetsDirectional.only(end: 8),
                    child: Text(value!, style: const TextStyle(color: AppColors.gray500, fontWeight: FontWeight.w700, fontSize: 13)),
                  ),
                // Material chevrons mirror themselves in RTL.
                const Icon(Icons.chevron_right, color: AppColors.gray400, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ChangePasswordDialog extends ConsumerStatefulWidget {
  const _ChangePasswordDialog();

  @override
  ConsumerState<_ChangePasswordDialog> createState() => _ChangePasswordDialogState();
}

class _ChangePasswordDialogState extends ConsumerState<_ChangePasswordDialog> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit(AppStrings strings) async {
    if (_next.text.length < 6) return setState(() => _error = strings.passwordTooShort);
    if (_next.text != _confirm.text) return setState(() => _error = strings.passwordsDoNotMatch);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).changePassword(currentPassword: _current.text, newPassword: _next.text);
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = errorMessage(e, ref.read(stringsProvider)));
    } catch (_) {
      if (mounted) setState(() => _error = strings.genericError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    return AlertDialog(
      title: Text(strings.changePassword),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              key: const Key('current-password'),
              controller: _current,
              obscureText: true,
              decoration: InputDecoration(hintText: strings.currentPassword),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const Key('new-password'),
              controller: _next,
              obscureText: true,
              decoration: InputDecoration(hintText: strings.newPassword),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const Key('confirm-password'),
              controller: _confirm,
              obscureText: true,
              decoration: InputDecoration(hintText: strings.confirmPassword),
            ),
            if (_error != null) _DialogError(_error!),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: _busy ? null : () => Navigator.pop(context, false), child: Text(strings.cancel)),
        TextButton(
          key: const Key('change-password-submit'),
          onPressed: _busy ? null : () => _submit(strings),
          child: Text(strings.save),
        ),
      ],
    );
  }
}

class _DeleteAccountDialog extends ConsumerStatefulWidget {
  const _DeleteAccountDialog();

  @override
  ConsumerState<_DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends ConsumerState<_DeleteAccountDialog> {
  final _password = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit(AppStrings strings) async {
    if (_password.text.isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).deleteAccount(_password.text);
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = errorMessage(e, ref.read(stringsProvider)));
    } catch (_) {
      if (mounted) setState(() => _error = strings.genericError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    return AlertDialog(
      title: Text(strings.deleteAccount),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(strings.deleteAccountBody, style: const TextStyle(color: AppColors.gray600, height: 1.5)),
            const SizedBox(height: 16),
            TextField(
              key: const Key('delete-password'),
              controller: _password,
              obscureText: true,
              decoration: InputDecoration(hintText: strings.password),
            ),
            if (_error != null) _DialogError(_error!),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: _busy ? null : () => Navigator.pop(context, false), child: Text(strings.cancel)),
        TextButton(
          key: const Key('delete-account-submit'),
          onPressed: _busy ? null : () => _submit(strings),
          child: Text(strings.deleteAccountConfirm, style: const TextStyle(color: AppColors.red500)),
        ),
      ],
    );
  }
}

class _DialogError extends StatelessWidget {
  const _DialogError(this.message);

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Text(message, style: const TextStyle(color: AppColors.red500, fontWeight: FontWeight.w700, fontSize: 13)),
    );
  }
}
