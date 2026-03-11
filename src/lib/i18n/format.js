import { t } from "./index";

const localeFromLang = (lang) => {
  switch (lang) {
    case "ko":
      return "ko-KR";
    case "zh":
      return "zh-CN";
    case "ja":
      return "ja-JP";
    case "en":
    default:
      return "en-US";
  }
};

export const formatNumber = (value, lang = "en") => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "";
  return numeric.toLocaleString(localeFromLang(lang));
};

export const formatCurrencyUSD = (value, lang = "en") => {
  const formatted = formatNumber(value, lang);
  return formatted ? `$${formatted}` : "";
};

export const formatPriceSingle = (value, lang = "en") => {
  if (value === null || value === undefined) return t("price.inquire", lang);
  return formatCurrencyUSD(value, lang);
};

export const formatPriceRange = (min, max, lang = "en") => {
  const hasMin = min !== null && min !== undefined;
  const hasMax = max !== null && max !== undefined;
  if (hasMin && hasMax) {
    return `${formatCurrencyUSD(min, lang)} - ${formatCurrencyUSD(max, lang)}`;
  }
  if (hasMin) return `${formatCurrencyUSD(min, lang)}${t("price.plus", lang)}`;
  if (hasMax) return `${t("price.upTo", lang)} ${formatCurrencyUSD(max, lang)}`;
  return t("price.askQuote", lang);
};

export const formatDate = (value, lang = "en") => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(localeFromLang(lang));
};
