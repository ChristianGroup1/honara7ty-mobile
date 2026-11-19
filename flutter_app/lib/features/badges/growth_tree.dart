import 'package:flutter/material.dart';

import '../../core/theme.dart';

class GrowthStage {
  const GrowthStage(this.index, this.key, this.minDays, this.name);
  final int index;
  final String key;
  final int minDays;
  final String name;
}

const growthStages = [
  GrowthStage(0, 'seed', 0, 'بذرة'),
  GrowthStage(1, 'sprout', 1, 'برعم'),
  GrowthStage(2, 'seedling', 3, 'شتلة'),
  GrowthStage(3, 'sapling', 7, 'غصن صغير'),
  GrowthStage(4, 'young', 14, 'شجرة يافعة'),
  GrowthStage(5, 'leafy', 30, 'شجرة مورقة'),
  GrowthStage(6, 'flowering', 60, 'شجرة مزهرة'),
  GrowthStage(7, 'fruiting', 90, 'شجرة مثمرة'),
  GrowthStage(8, 'flourishing', 180, 'شجرة وارفة'),
  GrowthStage(9, 'lifeTree', 365, 'شجرة الحياة'),
];

class GrowthTreeInfo {
  const GrowthTreeInfo({
    required this.stage,
    required this.nextStage,
    required this.completedDays,
    required this.daysToNext,
    required this.progress,
    required this.thriving,
  });

  final GrowthStage stage;
  final GrowthStage? nextStage;
  final int completedDays;
  final int daysToNext;
  final double progress;
  final bool thriving;
  bool get isMax => nextStage == null;
}

GrowthTreeInfo growthTreeInfo(int completedDays, int streak) {
  final days = completedDays < 0 ? 0 : completedDays;
  var stage = growthStages.first;
  for (final candidate in growthStages) {
    if (days >= candidate.minDays) {
      stage = candidate;
    } else {
      break;
    }
  }
  final next = stage.index < growthStages.length - 1
      ? growthStages[stage.index + 1]
      : null;
  final daysToNext =
      next == null ? 0 : (next.minDays - days).clamp(0, 1 << 30).toInt();
  var progress = 1.0;
  if (next != null) {
    final span = next.minDays - stage.minDays;
    progress = span > 0 ? (days - stage.minDays) / span : 1;
    progress = progress.clamp(0, 1).toDouble();
  }
  return GrowthTreeInfo(
    stage: stage,
    nextStage: next,
    completedDays: days,
    daysToNext: daysToNext,
    progress: progress,
    thriving: streak > 0,
  );
}

String arabicDigits(int n) => '$n'.replaceAllMapped(
      RegExp(r'[0-9]'),
      (m) => '٠١٢٣٤٥٦٧٨٩'[int.parse(m[0]!)],
    );

class GrowthTreeCard extends StatelessWidget {
  const GrowthTreeCard({
    super.key,
    required this.completedDays,
    required this.streak,
  });

  final int completedDays;
  final int streak;

  @override
  Widget build(BuildContext context) {
    final info = growthTreeInfo(completedDays, streak);
    final status = info.isMax
        ? 'وصلت لأعلى مرحلة — شجرتك مثمرة ووارفة'
        : info.thriving
            ? 'شجرتك مزدهرة بثباتك، استمر'
            : 'ارجع لخلوتك النهاردة واري شجرتك';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFD1FAE5)),
                ),
                child: const Text(
                  'شجرة النمو',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF047857),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                info.stage.name,
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF94A3B8),
                ),
              ),
              const Spacer(),
              Text(
                '${arabicDigits(completedDays)} يوم خلوة',
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFFF8FAFC), Color(0xFFECFDF5)],
              ),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Row(
              children: [
                Container(
                  width: 112,
                  height: 112,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF10B981).withValues(alpha: 0.18),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.asset(
                        'assets/images/growth_tree.jpg',
                        fit: BoxFit.cover,
                      ),
                      // Soft vignette like Stitch
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Color(0x4D0F172A),
                            ],
                            stops: [0.55, 1],
                          ),
                        ),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.92),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.water_drop_rounded,
                            size: 14,
                            color: info.thriving
                                ? const Color(0xFF0EA5E9)
                                : const Color(0xFF94A3B8),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'شجرتك الروحية',
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                      Text(
                        info.stage.name,
                        style: const TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        status,
                        style: const TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF475569),
                          height: 1.4,
                        ),
                      ),
                      if (info.nextStage != null) ...[
                        const SizedBox(height: 10),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: LinearProgressIndicator(
                            value: info.progress,
                            minHeight: 8,
                            backgroundColor: const Color(0xFFE2E8F0),
                            valueColor: const AlwaysStoppedAnimation(
                              Color(0xFF10B981),
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'فاضل ${arabicDigits(info.daysToNext)} يوم لمرحلة «${info.nextStage!.name}»',
                          style: const TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF065F46),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 10),
          const Text(
            '«فَيَكُونُ كَشَجَرَةٍ مَغْرُوسَةٍ عِنْدَ مَجَارِي الْمِيَاهِ» (مز 1 : 3)',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: AppFonts.verse,
              fontSize: 12,
              color: Color(0xFF64748B),
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}
