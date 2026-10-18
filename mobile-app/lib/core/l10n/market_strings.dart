import 'app_strings.dart';

/// Copy for the buyer-side screens added after the first port: search
/// filters, Smart AI, comparison, the parts marketplace and notifications.
/// Arabic wording follows the site where the site has the same screen
/// (SearchResultsScreen.tsx, SmartAIScreen.tsx, PartDetailsScreen.tsx,
/// NotificationsScreen.tsx, AuthScreen.tsx).
extension MarketStrings on AppStrings {
  String _t(String ar, String en) => isArabic ? ar : en;

  // Search results and filters
  String get noResults => _t('لا توجد نتائج', 'No results');
  String get noResultsBody => _t('جرّب كلمات أخرى أو خفف الفلاتر.', 'Try other words or loosen the filters.');
  String get closestMatches =>
      _t('لم نجد نتائج مطابقة تمامًا لبحثك، إليك أقرب السيارات المتاحة:', 'No exact match for your search. Here are the closest cars:');
  String get filters => _t('الفلاتر', 'Filters');
  String get applyFilters => _t('تطبيق', 'Apply');
  String get clearFilters => _t('مسح الكل', 'Clear all');
  String get anyOption => _t('الكل', 'Any');
  String get brand => _t('الماركة', 'Make');
  String get priceRange => _t('السعر (ج.م)', 'Price (EGP)');
  String get yearRange => _t('سنة الصنع', 'Year');
  String get minLabel => _t('من', 'From');
  String get maxLabel => _t('إلى', 'To');
  String get gearbox => _t('ناقل الحركة', 'Transmission');
  String get city => _t('المدينة', 'City');
  String get sortBy => _t('الترتيب', 'Sort by');
  String get sortRelevance => _t('الأكثر صلة', 'Most relevant');
  String get sortPriceLow => _t('السعر: الأقل أولًا', 'Price: low to high');
  String get sortPriceHigh => _t('السعر: الأعلى أولًا', 'Price: high to low');
  String get sortNewestYear => _t('الموديل: الأحدث أولًا', 'Year: newest first');
  String get sortMileage => _t('الأقل كيلومترات', 'Lowest mileage');
  String filtersActive(int n) => _t('$n فلتر مفعّل', n == 1 ? '1 filter on' : '$n filters on');
  String get filtersHint =>
      _t('تُطبَّق الفلاتر على نتائج البحث الحالية.', 'Filters apply to the current search results.');

  // Smart AI
  String get smartAi => _t('أسواق السيارات الذكي', 'Smart Car Search');
  String get smartAiIntro => _t(
        'اسألني عن أي سيارة، مثلًا: "كيا سبورتاج"، "BMW موديل 2022" أو "عربية أوتوماتيك أقل من مليون جنيه".',
        'Ask me about any car, for example "Kia Sportage", "BMW 2022" or "an automatic car under one million EGP".',
      );
  String get smartAiHint => _t('اكتب ما تبحث عنه...', 'Describe what you are looking for...');
  String get send => _t('إرسال', 'Send');
  String get thinking => _t('جارٍ البحث...', 'Searching...');
  String get newChat => _t('محادثة جديدة', 'New chat');
  String get suggestion1 => _t('سيارة عائلية أوتوماتيك', 'Automatic family car');
  String get suggestion2 => _t('BMW موديل 2022', 'BMW 2022');
  String get suggestion3 => _t('أقل من مليون جنيه', 'Under one million EGP');

  // Comparison
  String get compare => _t('مقارنة السيارات', 'Compare cars');
  String get addToCompare => _t('أضف للمقارنة', 'Add to compare');
  String get removeFromCompare => _t('إزالة من المقارنة', 'Remove from compare');
  String compareCount(int n) => _t('مقارنة ($n)', 'Compare ($n)');
  String get compareEmpty => _t('لم تختر سيارات للمقارنة', 'No cars to compare yet');
  String get compareEmptyBody => _t(
        'افتح أي سيارة واضغط "أضف للمقارنة". يمكنك مقارنة حتى 3 سيارات.',
        'Open any car and tap "Add to compare". You can compare up to 3 cars.',
      );
  String get compareFull => _t('يمكنك مقارنة 3 سيارات كحد أقصى', 'You can compare up to 3 cars');
  String get compareNeedTwo => _t('أضف سيارة أخرى على الأقل للمقارنة.', 'Add at least one more car to compare.');
  String get clearCompare => _t('مسح المقارنة', 'Clear comparison');
  String get price => _t('السعر', 'Price');
  String get location => _t('الموقع', 'Location');
  String get dealer => _t('المعرض', 'Dealer');
  String get km => _t('كم', 'km');
  String get currency => _t('ج.م', 'EGP');

  // Parts marketplace
  String get partsMarket => _t('قطع الغيار', 'Spare parts');
  String get partsSearchHint => _t('ابحث باسم القطعة أو رقمها أو السيارة...', 'Search by part name, number or car...');
  String get noParts => _t('لا توجد قطع متاحة', 'No parts available');
  String get noPartsMatch => _t('لا توجد قطع تطابق بحثك', 'No parts match your search');
  String get partNumber => _t('رقم القطعة', 'Part number');
  String get manufacturer => _t('الشركة المصنعة', 'Manufacturer');
  String get condition => _t('الحالة', 'Condition');
  String get conditionNew => _t('جديد', 'New');
  String get conditionUsed => _t('مستعمل', 'Used');
  String get compatibleWith => _t('متوافقة مع', 'Fits');
  String get deliveryAvailable => _t('التوصيل متاح', 'Delivery available');
  String get priceOnRequest => _t('السعر عند الطلب', 'Price on request');
  String get unavailable => _t('غير متاحة', 'Unavailable');
  String get whatsapp => _t('واتساب', 'WhatsApp');
  String get call => _t('اتصال', 'Call');
  String get openMap => _t('الموقع على الخريطة', 'Open in Maps');
  String get requestOrder => _t('اطلب القطعة', 'Request this part');
  String get pickup => _t('استلام من المحل', 'Pick up at the shop');
  String get delivery => _t('توصيل', 'Delivery');
  String get deliveryAddress => _t('عنوان التوصيل', 'Delivery address');
  String get notesOptional => _t('ملاحظات (اختياري)', 'Notes (optional)');
  String get addressRequired => _t('اكتب عنوان التوصيل', 'Enter the delivery address');
  String get orderSent => _t('تم إرسال طلبك للتاجر', 'Your request was sent to the dealer');
  String get myPartOrders => _t('طلبات قطع الغيار', 'My part orders');
  String get noOrders => _t('لا توجد طلبات بعد', 'No orders yet');
  String orderNumber(int id) => _t('طلب #$id', 'Order #$id');
  String orderStatus(String status) {
    switch (status) {
      case 'pending':
        return _t('قيد المراجعة', 'Pending');
      case 'confirmed':
        return _t('تم التأكيد', 'Confirmed');
      case 'delivered':
        return _t('تم التسليم', 'Delivered');
      case 'cancelled':
        return _t('ملغي', 'Cancelled');
      default:
        return status;
    }
  }

  // Notifications
  String get notificationsTitle => _t('الإشعارات', 'Notifications');
  String get noNotifications => _t('لا توجد إشعارات', 'No notifications');
  String get noNotificationsBody =>
      _t('ستظهر هنا إشعارات المتابعة والمفضلة وموافقة الحساب.', 'Follows, favorites and account approvals appear here.');
  String get markAllRead => _t('تحديد الكل كمقروء', 'Mark all as read');

  // Dealer registration
  String get businessType => _t('نوع النشاط', 'Business type');
  String get carDealerType => _t('معرض سيارات', 'Car dealer');
  String get partsDealerType => _t('تاجر قطع غيار', 'Spare parts dealer');
  String get dealerCategory => _t('فئة المعرض', 'Dealer category');
  String dealerCategoryLabel(String value) {
    switch (value) {
      case 'multi_branch':
        return _t('أكثر من فرع (2-5)', 'Several branches (2-5)');
      case 'chain':
        return _t('سلسلة معارض كبرى', 'Large dealer chain');
      case 'importer':
        return _t('مستورد سيارات', 'Car importer');
      case 'official_agent':
        return _t('وكيل رسمي', 'Official agent');
      default:
        return _t('معرض واحد', 'Single showroom');
    }
  }

  String get phoneFormatError => _t(
        'اكتب رقم الهاتف بدون الصفر في البداية وبدون كود الدولة (مثال: 1001234567).',
        'Enter the phone number without the leading zero and without the country code (e.g. 1001234567).',
      );
  String get emailRequired => _t('اكتب البريد الإلكتروني', 'Enter your email address');
  String get passwordRequired => _t('اكتب كلمة المرور', 'Enter your password');
  String get nameRequired => _t('اكتب الاسم', 'Enter your name');
  String get continueAsGuest => _t('تصفح بدون تسجيل', 'Continue as guest');
  // Terms acceptance at sign-up (same wording as the website).
  String get acceptTermsPrefix => _t('قرأت وأوافق على', 'I have read and agree to the');
  String get termsOfUseLink => _t('شروط الاستخدام', 'Terms of Use');
  String get termsAnd => _t('و', 'and the');
  String get privacyPolicyLink => _t('سياسة الخصوصية', 'Privacy Policy');
  String get termsRequired =>
      _t('يجب الموافقة على شروط الاستخدام وسياسة الخصوصية لإنشاء حساب.', 'You must accept the Terms of Use and Privacy Policy to create an account.');
  String get phoneLabel => _t('رقم الهاتف', 'Phone number');
  String get whatsappLabel => _t('رقم واتساب', 'WhatsApp number');
  String get branchesLabel => _t('عدد الفروع', 'Number of branches');
  String get addressLabel => _t('العنوان', 'Address');
  // Footer, showroom profile and cards
  String get termsTitle => _t('الشروط والأحكام', 'Terms & Conditions');
  String get privacyTitle => _t('سياسة الخصوصية', 'Privacy Policy');
  String get rightsReserved => _t('جميع الحقوق محفوظة.', 'All rights reserved.');
  String get followFailed => _t('فشل تحديث المتابعة', 'Could not update the follow');
  String get ratingFailed => _t('فشل إرسال التقييم', 'Could not send the rating');
  String branchesN(int n) => _t('$n فروع', n == 1 ? '1 branch' : '$n branches');
  String followersN(int n) => _t('$n متابع', n == 1 ? '1 follower' : '$n followers');
  String get followDealer => _t('متابعة المعرض', 'Follow dealer');
  String get unfollowDealer => _t('إلغاء المتابعة', 'Unfollow');
  String get rateDealer => _t('قيم هذا المعرض', 'Rate this dealer');
  String get ourBranches => _t('فروعنا', 'Our branches');
  String viewAllBranches(int n) => _t('عرض جميع الفروع ($n)', 'View all branches ($n)');
  String get viewOnMap => _t('عرض الموقع على الخريطة', 'View on map');
  String modelYear(int year) => _t('$year موديل', 'Model $year');
  String get egyptExclusive => _t('مصر حصري', 'Egypt exclusive');
  String get forgotPasswordTitle => _t('نسيت كلمة المرور', 'Forgot Password');
  String get forgotPasswordSubtitle => _t('أدخل بريدك الإلكتروني لاستلام رمز التحقق', 'Enter your email to receive a verification code');
}
