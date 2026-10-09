/// Dart mirror of src/constants/translations.ts. Only the keys actually
/// used by the screens built so far are included; add more as each screen
/// is ported, copying the exact AR/EN copy from the source file so wording
/// stays identical between web and mobile.
enum AppLanguage { ar, en }

class AppStrings {
  const AppStrings({
    required this.appName,
    required this.home,
    required this.reels,
    required this.favorites,
    required this.profile,
    required this.searchPlaceholder,
    required this.search,
    required this.carsFound,
    required this.welcomeBack,
    required this.createAccount,
    required this.signInToContinue,
    required this.joinExclusive,
    required this.fullName,
    required this.emailAddress,
    required this.password,
    required this.confirmPassword,
    required this.signIn,
    required this.register,
    required this.processing,
    required this.passwordTooShort,
    required this.passwordsDoNotMatch,
    required this.verifyEmailTitle,
    required this.otpSentTo,
    required this.otpSentMessage,
    required this.otpResentMessage,
    required this.otpIncomplete,
    required this.verifyCode,
    required this.sendCode,
    required this.resendCode,
    required this.resendCodeIn,
    required this.backToLogin,
    required this.passwordResetSuccess,
    required this.newPassword,
    required this.userRole,
    required this.dealerRole,
    required this.switchLanguage,
    required this.description,
    required this.fixedPrice,
    required this.officialDealer,
    required this.year,
    required this.mileage,
    required this.fuel,
    required this.trans,
    required this.contact,
    required this.available,
    required this.reserved,
    required this.sold,
    required this.featured,
    required this.noFavorites,
    required this.tapHeart,
    required this.logout,
    required this.forgotPassword,
    required this.backToSignIn,
    required this.comingSoon,
    required this.comingSoonBody,
  });

  final String appName;
  final String home;
  final String reels;
  final String favorites;
  final String profile;
  final String searchPlaceholder;
  final String search;
  final String carsFound;
  final String welcomeBack;
  final String createAccount;
  final String signInToContinue;
  final String joinExclusive;
  final String fullName;
  final String emailAddress;
  final String password;
  final String confirmPassword;
  final String signIn;
  final String register;
  final String processing;
  final String passwordTooShort;
  final String passwordsDoNotMatch;
  final String verifyEmailTitle;
  final String otpSentTo;
  final String otpSentMessage;
  final String otpResentMessage;
  final String otpIncomplete;
  final String verifyCode;
  final String sendCode;
  final String resendCode;
  final String resendCodeIn;
  final String backToLogin;
  final String passwordResetSuccess;
  final String newPassword;
  final String userRole;
  final String dealerRole;
  final String switchLanguage;
  final String description;
  final String fixedPrice;
  final String officialDealer;
  final String year;
  final String mileage;
  final String fuel;
  final String trans;
  final String contact;
  final String available;
  final String reserved;
  final String sold;
  final String featured;
  final String noFavorites;
  final String tapHeart;
  final String logout;
  final String forgotPassword;
  final String backToSignIn;
  // Not present in translations.ts — added for the mobile placeholder
  // screens that don't have a web equivalent to source copy from yet.
  final String comingSoon;
  final String comingSoonBody;

  String statusLabel(String status) {
    switch (status) {
      case 'reserved':
        return reserved;
      case 'sold':
        return sold;
      default:
        return available;
    }
  }

  static const ar = AppStrings(
    appName: 'سوق السيارات',
    home: 'الرئيسية',
    reels: 'فيديوهات',
    favorites: 'المفضلة',
    profile: 'حسابي',
    searchPlaceholder: 'ابحث تناسبا..',
    search: 'بحث',
    carsFound: 'سيارة وجدت',
    welcomeBack: 'مرحباً بعودتك',
    createAccount: 'إنشاء حساب',
    signInToContinue: 'سجل الدخول لمتابعة رحلة البحث',
    joinExclusive: 'انضم إلى سوق السيارات الحصري',
    fullName: 'الاسم الكامل',
    emailAddress: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    signIn: 'تسجيل الدخول',
    register: 'تسجيل',
    processing: 'جاري المعالجة...',
    passwordTooShort: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
    passwordsDoNotMatch: 'كلمات المرور غير متطابقة',
    verifyEmailTitle: 'تحقق من بريدك الإلكتروني',
    otpSentTo: 'أرسلنا رمزاً مكوناً من 6 أرقام إلى',
    otpSentMessage: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.',
    otpResentMessage: 'تم إرسال رمز تحقق جديد.',
    otpIncomplete: 'يرجى إدخال الرمز المكون من 6 أرقام.',
    verifyCode: 'تحقق من الرمز',
    sendCode: 'إرسال الرمز',
    resendCode: 'إعادة إرسال الرمز',
    resendCodeIn: 'إعادة الإرسال خلال',
    backToLogin: 'العودة لتسجيل الدخول',
    passwordResetSuccess: 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.',
    newPassword: 'كلمة المرور الجديدة',
    userRole: 'مستخدم عادي',
    dealerRole: 'معرض سيارات',
    switchLanguage: 'English',
    description: 'الوصف',
    fixedPrice: 'سعر ثابت',
    officialDealer: 'تاجر معتمد',
    year: 'السنة',
    mileage: 'المسافة',
    fuel: 'الوقود',
    trans: 'ناقل الحركة',
    contact: 'تواصل',
    available: 'متاحة',
    reserved: 'محجوزة',
    sold: 'تم البيع',
    featured: 'ممول',
    noFavorites: 'لا توجد مفضلات بعد',
    tapHeart: 'اضغط على أيقونة القلب في أي سيارة لحفظها هنا.',
    logout: 'تسجيل الخروج',
    forgotPassword: 'نسيت كلمة المرور؟',
    backToSignIn: 'العودة لتسجيل الدخول',
    comingSoon: 'قريباً',
    comingSoonBody: 'هذه الميزة قيد التطوير وستكون متاحة قريباً.',
  );

  static const en = AppStrings(
    appName: 'Souq Cars',
    home: 'Home',
    reels: 'Reels',
    favorites: 'Favorites',
    profile: 'Profile',
    searchPlaceholder: 'Search make or model...',
    search: 'Search',
    carsFound: 'Cars found',
    welcomeBack: 'Welcome Back',
    createAccount: 'Create Account',
    signInToContinue: 'Sign in to continue your car hunt',
    joinExclusive: 'Join our exclusive car marketplace',
    fullName: 'Full Name',
    emailAddress: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    signIn: 'Sign In',
    register: 'Register',
    processing: 'Processing...',
    passwordTooShort: 'Password must be at least 6 characters',
    passwordsDoNotMatch: 'Passwords do not match',
    verifyEmailTitle: 'Verify Your Email',
    otpSentTo: 'We sent a 6-digit code to',
    otpSentMessage: 'A verification code has been sent to your email.',
    otpResentMessage: 'A new verification code has been sent.',
    otpIncomplete: 'Please enter the 6-digit code.',
    verifyCode: 'Verify Code',
    sendCode: 'Send Code',
    resendCode: 'Resend Code',
    resendCodeIn: 'Resend code in',
    backToLogin: 'Back to Login',
    passwordResetSuccess: 'Password changed successfully. You can now log in.',
    newPassword: 'New Password',
    userRole: 'User',
    dealerRole: 'Car Dealer',
    switchLanguage: 'العربية',
    description: 'Description',
    fixedPrice: 'Fixed Price',
    officialDealer: 'Official Dealer',
    year: 'Year',
    mileage: 'Mileage',
    fuel: 'Fuel',
    trans: 'Trans',
    contact: 'Contact',
    available: 'Available',
    reserved: 'Reserved',
    sold: 'Sold',
    featured: 'Featured',
    noFavorites: 'No favorites yet',
    tapHeart: 'Tap the heart icon on any car to save it here.',
    logout: 'Log Out',
    forgotPassword: 'Forgot password?',
    backToSignIn: 'Back to Sign In',
    comingSoon: 'Coming soon',
    comingSoonBody: 'This feature is under development and will be available soon.',
  );

  static AppStrings of(AppLanguage lang) => lang == AppLanguage.ar ? ar : en;
}

/// Buyer-marketplace copy (Home, dealer cards, dealer profile), taken
/// verbatim from the same keys in src/constants/translations.ts.
extension MarketplaceStrings on AppStrings {
  bool get isArabic => identical(this, AppStrings.ar);

  String get viewAll => isArabic ? 'عرض الكل' : 'View All';
  String get findDreamRide => isArabic ? 'جد سيارة أحلامك اليوم' : 'Find your dream ride today';
  String get topDealers => isArabic ? 'أفضل المعارض' : 'Top Dealers';
  String get featuredCars => isArabic ? 'سيارات مميزة' : 'Featured Cars';
  String get carsCount => isArabic ? 'سيارة' : 'Cars';
  String get reviews => isArabic ? 'تقييم' : 'Reviews';
  String get inventory => isArabic ? 'المخزون' : 'Inventory';
  String get verifiedDealer => isArabic ? 'تاجر موثق' : 'Verified Dealer';
}
