import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/market_strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/car.dart';
import '../../../shared/providers/compare_provider.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/web_layout.dart';
import '../../dealers/presentation/manage/dealer_widgets.dart' show EmptyView;

/// Side-by-side comparison of up to three cars picked from their details
/// pages. Uses the listings already loaded; nothing is sent to the server.
class CompareCarsScreen extends ConsumerWidget {
  const CompareCarsScreen({super.key});

  static final _number = NumberFormat.decimalPattern();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final cars = ref.watch(compareProvider);
    final notifier = ref.read(compareProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.compare),
        actions: [
          if (cars.isNotEmpty)
            TextButton(key: const Key('compare-clear'), onPressed: notifier.clear, child: Text(strings.clearCompare)),
        ],
      ),
      body: WebColumn(
        child: cars.isEmpty
            ? Center(child: EmptyView(icon: Icons.compare_arrows_rounded, title: strings.compareEmpty, body: strings.compareEmptyBody))
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (cars.length < 2)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(strings.compareNeedTwo, style: const TextStyle(color: AppColors.amber600, fontWeight: FontWeight.w700)),
                    ),
                  _CompareRow(label: '', cars: cars, header: (car) => _CarHeader(car: car, onRemove: () => notifier.remove(car.id))),
                  _CompareRow(
                    label: strings.price,
                    cars: cars,
                    cell: (c) => '${_number.format(c.price)} ${strings.currency}',
                    best: _best(cars, (c) => c.price, lowest: true),
                  ),
                  _CompareRow(label: strings.year, cars: cars, cell: (c) => '${c.year}', best: _best(cars, (c) => c.year, lowest: false)),
                  _CompareRow(
                    label: strings.mileage,
                    cars: cars,
                    cell: (c) => '${_number.format(c.mileage)} ${strings.km}',
                    best: _best(cars, (c) => c.mileage, lowest: true),
                  ),
                  _CompareRow(label: strings.fuel, cars: cars, cell: (c) => c.fuelType),
                  _CompareRow(label: strings.gearbox, cars: cars, cell: (c) => c.transmission),
                  _CompareRow(label: strings.location, cars: cars, cell: (c) => c.location),
                  _CompareRow(label: strings.dealer, cars: cars, cell: (c) => c.dealerName ?? '-'),
                ],
              ),
      ),
    );
  }

  /// The id of the single best car for a value (lowest price, newest year,
  /// lowest mileage), or null when fewer than two cars or the top two tie.
  static int? _best(List<Car> cars, num Function(Car) value, {required bool lowest}) {
    if (cars.length < 2) return null;
    final sorted = [...cars]..sort((a, b) => lowest ? value(a).compareTo(value(b)) : value(b).compareTo(value(a)));
    return value(sorted[0]) == value(sorted[1]) ? null : sorted[0].id;
  }
}

class _CompareRow extends StatelessWidget {
  const _CompareRow({required this.label, required this.cars, this.cell, this.header, this.best});

  final String label;
  final List<Car> cars;
  final String Function(Car)? cell;
  final Widget Function(Car)? header;
  final int? best;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.gray100))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 84,
            child: Text(label, style: const TextStyle(color: AppColors.gray500, fontWeight: FontWeight.w700, fontSize: 12)),
          ),
          for (final car in cars)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: header != null
                    ? header!(car)
                    : Text(
                        cell!(car),
                        key: Key('compare-cell-$label-${car.id}'),
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                          color: best == car.id ? AppColors.emerald600 : AppColors.gray900,
                        ),
                      ),
              ),
            ),
        ],
      ),
    );
  }
}

class _CarHeader extends StatelessWidget {
  const _CarHeader({required this.car, required this.onRemove});

  final Car car;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => context.push('/car/${car.id}'),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: AspectRatio(
              aspectRatio: 4 / 3,
              child: car.coverImage.isEmpty
                  ? Container(color: AppColors.gray100, child: const Icon(Icons.directions_car_rounded, color: AppColors.gray400))
                  : CachedNetworkImage(
                      imageUrl: car.coverImage,
                      fit: BoxFit.cover,
                      errorWidget: (_, _, _) => Container(color: AppColors.gray100),
                    ),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text('${car.make} ${car.model}', maxLines: 2, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
        IconButton(
          key: Key('compare-remove-${car.id}'),
          visualDensity: VisualDensity.compact,
          onPressed: onRemove,
          icon: const Icon(Icons.close_rounded, size: 18, color: AppColors.gray500),
        ),
      ],
    );
  }
}
