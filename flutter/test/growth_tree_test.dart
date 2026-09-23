import 'package:flutter_test/flutter_test.dart';
import 'package:honara7ty/features/badges/growth_tree.dart';

void main() {
  test('growth stages follow completed days', () {
    expect(growthTreeInfo(0, 0).stage.key, 'seed');
    expect(growthTreeInfo(1, 1).stage.key, 'sprout');
    expect(growthTreeInfo(6, 1).stage.key, 'seedling');
    expect(growthTreeInfo(365, 2).stage.key, 'lifeTree');
    expect(growthTreeInfo(365, 2).isMax, isTrue);
    expect(growthTreeInfo(10, 0).thriving, isFalse);
    expect(growthTreeInfo(10, 3).stage.key, 'sapling');
    expect(growthTreeInfo(10, 3).daysToNext, 4);
  });
}
