import 'app_strings.dart';

/// Copy for reporting content and blocking dealers (routes/moderation.ts).
/// The Arabic follows the website's Terms section 6 and privacy section 6.
extension ModerationStrings on AppStrings {
  String _t(String ar, String en) => isArabic ? ar : en;

  String get report => _t('إبلاغ', 'Report');
  String get reportCar => _t('الإبلاغ عن السيارة', 'Report this car');
  String get reportReel => _t('الإبلاغ عن الفيديو', 'Report this video');
  String get reportPart => _t('الإبلاغ عن القطعة', 'Report this part');
  String get reportDealer => _t('الإبلاغ عن المعرض', 'Report this dealer');
  String get reportWhy => _t('ما المشكلة؟', 'What is wrong?');
  String get reportHint => _t(
        'يراجع فريق سوق السيارات البلاغات ولن يعرف صاحب المحتوى من أبلغ عنه.',
        'The Souq Cars team reviews reports. The owner is not told who reported them.',
      );
  String reportReason(String reason) {
    switch (reason) {
      case 'spam':
        return _t('إزعاج أو إعلان مكرر', 'Spam or repeated ads');
      case 'fraud':
        return _t('احتيال أو نصب', 'Fraud or scam');
      case 'inappropriate':
        return _t('محتوى غير لائق', 'Inappropriate content');
      case 'offensive':
        return _t('إساءة أو كراهية', 'Abusive or hateful');
      case 'misleading':
        return _t('معلومات مضللة أو سعر غير حقيقي', 'Misleading details or fake price');
      default:
        return _t('سبب آخر', 'Something else');
    }
  }

  String get reportDetails => _t('تفاصيل (اختياري)', 'Details (optional)');
  String get reportDetailsRequired => _t('اكتب المشكلة', 'Describe the problem');
  String get reportChooseReason => _t('اختر سبب البلاغ', 'Choose a reason');
  String get reportSubmit => _t('إرسال البلاغ', 'Send report');
  String get reportSending => _t('جارٍ الإرسال...', 'Sending...');
  String get reportSent => _t('شكرًا، وصلنا بلاغك وسنراجعه.', 'Thanks, we received your report and will review it.');
  String get reportAlreadySent => _t('أبلغت عن هذا المحتوى من قبل وما زال قيد المراجعة.', 'You already reported this. It is still under review.');
  String get reportTooMany => _t('أرسلت بلاغات كثيرة اليوم. حاول مرة أخرى غدًا.', 'You sent too many reports today. Try again tomorrow.');
  String get reportGone => _t('هذا المحتوى لم يعد موجودًا.', 'This content no longer exists.');
  String get reportOwn => _t('لا يمكنك الإبلاغ عن محتواك.', 'You cannot report your own content.');

  String get blockDealer => _t('حظر المعرض', 'Block dealer');
  String get unblockDealer => _t('إلغاء الحظر', 'Unblock');
  String get blockDealerBody => _t(
        'لن تظهر لك سيارات هذا المعرض وفيديوهاته وقطعه. يمكنك إلغاء الحظر من الإعدادات.',
        "You won't see this dealer's cars, videos or parts. You can unblock it in Settings.",
      );
  String get dealerBlocked => _t('تم حظر المعرض', 'Dealer blocked');
  String get dealerUnblocked => _t('تم إلغاء الحظر', 'Dealer unblocked');
  String get blockedDealerNotice => _t('حظرت هذا المعرض، لذلك نخفي محتواه.', 'You blocked this dealer, so its content is hidden.');
  String get blockedAccounts => _t('الحسابات المحظورة', 'Blocked accounts');
  String get noBlockedAccounts => _t('لم تحظر أي حساب', 'You have not blocked anyone');
  String get noBlockedAccountsBody =>
      _t('احظر معرضًا من صفحته لإخفاء محتواه.', "Block a dealer from its page to hide its content.");
  String get deletedAccount => _t('حساب محذوف', 'Deleted account');
}
