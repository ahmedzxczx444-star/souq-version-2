import 'app_strings.dart';

/// Copy for the dealer dashboard and management screens. Arabic wording
/// follows the site's dashboards (DealerDashboard.tsx, AddCarScreen.tsx,
/// AddReelScreen.tsx, PartsDashboard.tsx, ImporterDashboard.tsx...).
extension DealerStrings on AppStrings {
  String _t(String ar, String en) => isArabic ? ar : en;

  // Dashboard
  String get dashboard => _t('لوحة التحكم', 'Dashboard');
  String get myListings => _t('إعلاناتي', 'My Listings');
  String get myParts => _t('قطع الغيار', 'My Parts');
  String get noListingsYet => _t('لا توجد إعلانات بعد', 'No listings yet');
  String get noListingsBody => _t('أضف أول سيارة لتظهر للمشترين.', 'Add your first car so buyers can see it.');
  String get noPartsYet => _t('لا توجد قطع بعد', 'No parts yet');
  String get noPartsBody => _t('أضف أول قطعة إلى مخزونك.', 'Add the first part to your inventory.');
  String get totalCars => _t('السيارات', 'Cars');
  String get followers => _t('المتابعون', 'Followers');
  String get likes => _t('الإعجابات', 'Likes');
  String get totalParts => _t('القطع', 'Parts');
  String get availableParts => _t('المتاحة', 'Available');
  String get views => _t('المشاهدات', 'Views');
  String get branchesCount => _t('الفروع', 'Branches');
  String get employeesCount => _t('الموظفون', 'Employees');
  String get unassignedCars => _t('سيارات بدون فرع', 'Unassigned cars');
  String get chainOverview => _t('نظرة عامة على السلسلة', 'Chain overview');
  String get retry => _t('إعادة المحاولة', 'Retry');
  String get loadFailed => _t('تعذر تحميل البيانات', 'Could not load the data');
  String get dealersOnly => _t('هذه الصفحة للتجار فقط', 'This page is for dealers only');
  String get pendingApprovalTitle => _t('حسابك قيد المراجعة', 'Your account is under review');
  String get pendingApprovalBody => _t(
        'سيتم تفعيل النشر بعد موافقة الإدارة. يمكنك تجهيز ملف المعرض في هذه الأثناء.',
        'Publishing unlocks once an administrator approves your account. You can prepare your profile meanwhile.',
      );
  String get suspendedTitle => _t('الحساب موقوف', 'Account suspended');
  String get suspendedBody => _t('تواصل مع الدعم لإعادة تفعيل حسابك.', 'Contact support to reactivate your account.');

  String kindLabel(String kind) {
    switch (kind) {
      case 'multiBranch':
        return _t('معرض متعدد الفروع', 'Multi-branch dealer');
      case 'chain':
        return _t('سلسلة معارض', 'Dealer chain');
      case 'importer':
        return _t('مستورد', 'Importer');
      case 'officialAgent':
        return _t('وكيل معتمد', 'Official agent');
      case 'parts':
        return _t('تاجر قطع غيار', 'Parts dealer');
      default:
        return _t('معرض سيارات', 'Car dealer');
    }
  }

  // Tools
  String get addCar => _t('إضافة سيارة', 'Add Car');
  String get editCar => _t('تعديل السيارة', 'Edit Car');
  String get myReels => _t('الريلز', 'Reels');
  String get showroomProfile => _t('ملف المعرض', 'Showroom Profile');
  String get branches => _t('الفروع', 'Branches');
  String get employees => _t('الموظفون', 'Employees');
  String get warehouses => _t('المخازن', 'Warehouses');
  String get shipments => _t('الشحنات', 'Shipments');
  String get preorders => _t('طلبات الحجز المسبق', 'Pre-orders');
  String get serviceCenters => _t('مراكز الخدمة', 'Service Centers');
  String get offers => _t('العروض', 'Offers');
  String get warranties => _t('الضمانات', 'Warranties');
  String get addPart => _t('إضافة قطعة', 'Add Part');
  String get editPart => _t('تعديل القطعة', 'Edit Part');
  String get partOrders => _t('الطلبات', 'Orders');

  // Listing form
  String get make => _t('الماركة', 'Make');
  String get model => _t('الموديل', 'Model');
  String get price => _t('السعر (ج.م)', 'Price (EGP)');
  String get mileageKm => _t('المسافة المقطوعة (كم)', 'Mileage (km)');
  String get locationLabel => _t('الموقع', 'Location');
  String get fuelType => _t('نوع الوقود', 'Fuel type');
  String get transmissionLabel => _t('ناقل الحركة', 'Transmission');
  String get listingStatus => _t('الحالة', 'Status');
  String get photos => _t('الصور', 'Photos');
  String get addPhotos => _t('إضافة صور', 'Add photos');
  String get photoRules => _t('حتى 10 صور (JPG / PNG / WEBP، 5 ميجابايت للصورة)', 'Up to 10 photos (JPG / PNG / WEBP, 5 MB each)');
  String get photoRequired => _t('أضف صورة واحدة على الأقل', 'Add at least one photo');
  String get photoRejected => _t('بعض الصور غير مدعومة أو أكبر من 5 ميجابايت', 'Some photos are unsupported or larger than 5 MB');
  String get videoOptional => _t('فيديو (اختياري)', 'Video (optional)');
  String get chooseVideo => _t('اختيار فيديو', 'Choose video');
  String get videoRules => _t('MP4 أو MOV، حتى 100 ميجابايت و 3 دقائق', 'MP4 or MOV, up to 100 MB and 3 minutes');
  String get videoRejected => _t('الفيديو يجب أن يكون MP4 أو MOV وبحجم أقل من 100 ميجابايت', 'The video must be MP4 or MOV and under 100 MB');
  String get requiredField => _t('هذا الحقل مطلوب', 'This field is required');
  String get invalidNumber => _t('أدخل رقماً صحيحاً', 'Enter a valid number');
  String get invalidYear => _t('أدخل سنة صحيحة', 'Enter a valid year');
  String get publish => _t('نشر الإعلان', 'Publish Listing');
  String get saveChanges => _t('حفظ التعديلات', 'Save Changes');
  String get uploading => _t('جارٍ الرفع...', 'Uploading...');
  String get saved => _t('تم الحفظ', 'Saved');
  String get deleted => _t('تم الحذف', 'Deleted');
  String get edit => _t('تعديل', 'Edit');
  String get delete => _t('حذف', 'Delete');
  String get add => _t('إضافة', 'Add');
  String get deleteListingTitle => _t('حذف الإعلان؟', 'Delete this listing?');
  String get deleteListingBody => _t('سيتم حذف الإعلان وصوره نهائياً.', 'The listing will be permanently removed.');
  String get deleteItemTitle => _t('تأكيد الحذف', 'Confirm deletion');
  String get deleteItemBody => _t('لا يمكن التراجع عن هذا الإجراء.', 'This cannot be undone.');
  String get hiddenByAdmin => _t('مخفي من الإدارة', 'Hidden by admin');
  String get nothingHere => _t('لا توجد بيانات بعد', 'Nothing here yet');

  String fuelLabel(String value) {
    switch (value) {
      case 'Diesel':
        return _t('ديزل', 'Diesel');
      case 'Hybrid':
        return _t('هايبرد', 'Hybrid');
      case 'Electric':
        return _t('كهرباء', 'Electric');
      default:
        return _t('بنزين', 'Petrol');
    }
  }

  String transmissionValueLabel(String value) => value == 'Manual' ? _t('يدوي', 'Manual') : _t('أوتوماتيك', 'Automatic');

  String carStatusLabel(String value) {
    switch (value) {
      case 'reserved':
        return reserved;
      case 'sold':
        return sold;
      case 'hidden':
        return hiddenByAdmin;
      default:
        return available;
    }
  }

  // Reels
  String get newReel => _t('ريل جديد', 'New Reel');
  String get caption => _t('الوصف', 'Caption');
  String get linkedCar => _t('السيارة المرتبطة (اختياري)', 'Linked car (optional)');
  String get noLinkedCar => _t('بدون سيارة', 'No car');
  String get noReelsYet => _t('لم تنشر أي ريلز بعد', 'You have not posted any reels yet');
  String get uploadReel => _t('رفع الريل', 'Upload Reel');
  String get deleteReelTitle => _t('حذف الريل؟', 'Delete this reel?');
  String get videoSelected => _t('تم اختيار الفيديو', 'Video selected');
  String get noVideoPreview => _t(
        'المعاينة والتشغيل داخل التطبيق متاحان على أندرويد و iOS فقط.',
        'In-app preview and playback are available on Android and iOS only.',
      );

  // Profile
  String get showroomName => _t('اسم المعرض', 'Showroom name');
  String get phone => _t('رقم الهاتف', 'Phone');
  String get whatsapp => _t('رقم واتساب', 'WhatsApp');
  String get phoneHint => _t('+2010XXXXXXXX', '+2010XXXXXXXX');
  String get invalidPhone => _t('رقم مصري بصيغة ‎+20', 'Egyptian number in +20 format');
  String get address => _t('العنوان', 'Address');
  String get mapLink => _t('رابط الخريطة', 'Map link');
  String get logo => _t('الشعار', 'Logo');
  String get changeLogo => _t('تغيير الشعار', 'Change logo');
  String get addBranch => _t('إضافة فرع', 'Add branch');
  String get branchName => _t('اسم الفرع', 'Branch name');
  String get branchesManagedSeparately => _t(
        'تُدار فروعك من قسم «الفروع» في لوحة التحكم.',
        'Your branches are managed from the Branches section of the dashboard.',
      );
  String get buyerProfileNote => _t(
        'تعديل بيانات حساب المشتري غير متاح حالياً. يمكنك تغيير كلمة المرور من الإعدادات.',
        'Editing buyer account details is not available yet. You can change your password from Settings.',
      );

  // Parts
  String get partName => _t('اسم القطعة', 'Part name');
  String get partNumber => _t('رقم القطعة', 'Part number');
  String get manufacturer => _t('الشركة المصنعة', 'Manufacturer');
  String get category => _t('الفئة العامة', 'Category');
  String get partType => _t('نوع القطعة', 'Part type');
  String get condition => _t('الحالة', 'Condition');
  String get deliverySupported => _t('يدعم التوصيل', 'Delivery available');
  String get availableForSale => _t('متاحة للبيع', 'Available for sale');
  String get unavailable => _t('غير متاحة', 'Unavailable');
  String get compatibleCars => _t('السيارات المتوافقة', 'Compatible cars');
  String get addCompatibility => _t('إضافة سيارة متوافقة', 'Add compatible car');
  String get yearFrom => _t('من سنة', 'From year');
  String get yearTo => _t('إلى سنة', 'To year');
  String get deletePartTitle => _t('حذف القطعة؟', 'Delete this part?');

  String partSubtypeLabel(String value) {
    switch (value) {
      case 'imported_parts':
        return _t('قطع مستوردة', 'Imported parts');
      case 'half_cut':
        return _t('نص قطاعة', 'Half cut');
      case 'accessories':
        return _t('إكسسوارات وتحسينات', 'Accessories & upgrades');
      case 'tires_batteries':
        return _t('إطارات وبطاريات', 'Tires & batteries');
      case 'oils_consumables':
        return _t('زيوت ومستهلكات', 'Oils & consumables');
      default:
        return _t('قطع جديدة', 'New parts');
    }
  }

  String partConditionLabel(String value) {
    switch (value) {
      case 'used':
        return _t('مستعمل', 'Used');
      case 'refurbished':
        return _t('مجدد', 'Refurbished');
      default:
        return _t('جديد', 'New');
    }
  }
}
