import { LeadProfile } from '@ai-zhaoshang/shared';

export function extractLeadProfile(messages: Array<{ text: string }>): LeadProfile {
  const text = messages.map(message => message.text).join('\n');
  const phone = text.match(/(?<!\d)1[3-9]\d{9}(?!\d)/)?.[0];
  const wechat = text.match(/(?:微信|wx|wechat)[:：\s]*([a-zA-Z][-_a-zA-Z0-9]{5,19})/i)?.[1];
  const city = text.match(/([\u4e00-\u9fa5]{2,8})(?:市|地区|区域|县)/)?.[0];
  const budget = text.match(/(?:预算|投资|资金)[^\d]{0,6}([\d.]+\s*(?:万|w|W|万元)?)/)?.[1];
  const openingTime = text.match(/(?:开店|开业|启动|落地).{0,8}(今年|明年|下个月|[一二三四五六七八九十\d]+月)/)?.[1];

  const intentLevel = phone || wechat
    ? 'high'
    : /加盟|费用|政策|利润|回本|区域/.test(text)
      ? 'medium'
      : 'low';

  return {
    phone,
    wechat,
    city,
    budget,
    openingTime,
    intentLevel,
    summary: buildSummary({ phone, wechat, city, budget, openingTime }),
  };
}

function buildSummary(input: {
  phone?: string;
  wechat?: string;
  city?: string;
  budget?: string;
  openingTime?: string;
}): string {
  const parts = [
    input.phone ? `手机号：${input.phone}` : '',
    input.wechat ? `微信：${input.wechat}` : '',
    input.city ? `城市：${input.city}` : '',
    input.budget ? `预算：${input.budget}` : '',
    input.openingTime ? `开店时间：${input.openingTime}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('；') : '暂未识别到明确留资信息';
}
