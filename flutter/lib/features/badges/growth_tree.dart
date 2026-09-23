import 'package:flutter/material.dart';

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
  final daysToNext = next == null ? 0 : (next.minDays - days).clamp(0, 1 << 30).toInt();
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

class GrowthTreeCard extends StatelessWidget {
  const GrowthTreeCard({
    super.key,
    required this.completedDays,
    required this.streak,
    required this.card,
    required this.text,
    required this.muted,
    required this.isNight,
  });

  final int completedDays;
  final int streak;
  final Color card;
  final Color text;
  final Color muted;
  final bool isNight;

  @override
  Widget build(BuildContext context) {
    final info = growthTreeInfo(completedDays, streak);
    final status = info.isMax
        ? 'وصلت لأعلى مرحلة — شجرتك مثمرة ووارفة 🌳'
        : info.thriving
            ? 'شجرتك مزهرة بثباتك، استمر 🌿'
            : 'ارجع لخلوتك النهاردة وارْوِ شجرتك 💧';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text('$completedDays يوم خلوة', style: TextStyle(color: muted, fontSize: 12)),
              const Spacer(),
              const Text(
                'شجرة النمو',
                style: TextStyle(color: Color(0xFF4CAF50), fontWeight: FontWeight.w800),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            textDirection: TextDirection.rtl,
            children: [
              Container(
                width: 132,
                height: 132,
                decoration: BoxDecoration(
                  color: isNight ? const Color(0x1463C487) : const Color(0xFFF1F8F3),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: CustomPaint(
                  painter: _TreePainter(stage: info.stage.index, thriving: info.thriving),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('شجرتك الروحية', style: TextStyle(color: muted, fontSize: 13)),
                    Text(
                      info.stage.name,
                      textDirection: TextDirection.rtl,
                      style: TextStyle(color: text, fontSize: 20, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 6),
                    Text(status, textDirection: TextDirection.rtl, style: TextStyle(color: muted, fontSize: 12)),
                    if (info.nextStage != null) ...[
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(99),
                        child: LinearProgressIndicator(
                          value: info.progress,
                          minHeight: 8,
                          backgroundColor: muted.withValues(alpha: 0.15),
                          color: const Color(0xFF4CAF50),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'فاضل ${info.daysToNext} يوم لمرحلة «${info.nextStage!.name}»',
                        textDirection: TextDirection.rtl,
                        style: TextStyle(color: muted, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '«فيكون كشجرة مغروسة عند مجاري المياه» (مز 1 : 3)',
            textAlign: TextAlign.center,
            style: TextStyle(color: muted, fontSize: 12, fontStyle: FontStyle.italic),
          ),
        ],
      ),
    );
  }
}

class _TreePainter extends CustomPainter {
  _TreePainter({required this.stage, required this.thriving});
  final int stage;
  final bool thriving;

  @override
  void paint(Canvas canvas, Size size) {
    final leaf = thriving ? const Color(0xFF3E9B5B) : const Color(0xFF8AA58A);
    final trunk = Paint()..color = const Color(0xFF8D5A32);
    final soil = Paint()..color = const Color(0xFFC4A574);
    final center = Offset(size.width / 2, size.height * 0.78);
    canvas.drawOval(
      Rect.fromCenter(center: Offset(center.dx, size.height * 0.86), width: size.width * 0.7, height: 16),
      soil,
    );
    if (stage == 0) {
      canvas.drawCircle(Offset(center.dx, size.height * 0.8), 7, Paint()..color = const Color(0xFF6B4F2A));
      return;
    }
    final height = 18.0 + stage * 7;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(center.dx, center.dy - height / 2), width: 6 + stage * 0.4, height: height),
        const Radius.circular(4),
      ),
      trunk,
    );
    final canopy = Paint()..color = leaf;
    final radius = 8.0 + stage * 2.2;
    final top = center.dy - height;
    canvas.drawCircle(Offset(center.dx, top), radius, canopy);
    if (stage >= 2) {
      canvas.drawCircle(Offset(center.dx - radius * 0.7, top + 6), radius * 0.7, canopy);
      canvas.drawCircle(Offset(center.dx + radius * 0.7, top + 6), radius * 0.7, canopy);
    }
    if (stage >= 6) {
      final flower = Paint()..color = const Color(0xFFF2C14E);
      canvas.drawCircle(Offset(center.dx - 8, top - 4), 3, flower);
      canvas.drawCircle(Offset(center.dx + 10, top + 2), 3, flower);
    }
    if (stage >= 7) {
      final fruit = Paint()..color = const Color(0xFFE15A3A);
      canvas.drawCircle(Offset(center.dx, top + 8), 3.5, fruit);
    }
  }

  @override
  bool shouldRepaint(covariant _TreePainter oldDelegate) =>
      oldDelegate.stage != stage || oldDelegate.thriving != thriving;
}
