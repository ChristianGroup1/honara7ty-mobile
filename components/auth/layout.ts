type AuthChromeMetricsInput = {
  height: number;
  width: number;
  topInset: number;
};

export const getAuthChromeMetrics = ({
  height,
  width,
  topInset,
}: AuthChromeMetricsInput) => {
  const isCompactHeight = height < 720;
  const isCompactWidth = width < 360;
  const baseHeaderHeight = Math.max(150, Math.min(height * 0.22, 210));

  return {
    headerHeight: topInset + baseHeaderHeight,
    headerPaddingTop: topInset + (isCompactHeight ? 2 : 6),
    headerPaddingBottom: isCompactHeight ? 10 : 14,
    backButtonOffset: isCompactWidth ? 16 : 20,
    logoSize: isCompactWidth ? 58 : 100,
    heroIconSize: isCompactWidth ? 58 : 64,
    heroIconGlyphSize: isCompactWidth ? 28 : 32,
    titleFontSize: isCompactWidth ? 20 : 22,
    subtitleHorizontalPadding: isCompactWidth ? 24 : 40,
    formRadius: isCompactWidth ? 28 : 32,
    formHorizontalPadding: isCompactWidth ? 20 : 24,
    formTopPadding: isCompactHeight ? 26 : 32,
    formBottomPadding: isCompactHeight ? 32 : 50,
  };
};
