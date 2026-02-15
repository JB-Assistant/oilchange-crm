export function renderTemplate(template: string, data: Record<string, string | number | string[]>): string {
  let result = template;

  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    if (Array.isArray(value)) {
      result = result.replace(regex, value.length <= 2 ? value.join(" and ") : `${value.slice(0, -1).join(", ")}, and ${value[value.length - 1]}`);
    } else {
      result = result.replace(regex, String(value));
    }
  }

  return result;
}

export const DEFAULT_TEMPLATES = {
  twoWeeksBefore: `Hi {{firstName}}, this is {{shopName}}. Your {{serviceType}} is coming up around {{dueDate}}. Call us at {{shopPhone}} or reply BOOK to schedule. Reply STOP to opt out.`,

  oneWeekBefore: `Hi {{firstName}}, friendly reminder from {{shopName}} — your {{serviceType}} is due next week ({{dueDate}}). Call {{shopPhone}} or reply BOOK to schedule. Reply STOP to opt out.`,

  dueDateReminder: `Hi {{firstName}}, your {{serviceType}} is due now! {{shopName}} has openings this week. Call {{shopPhone}} or reply BOOK. Reply STOP to opt out.`,

  oneWeekOverdue: `Hi {{firstName}}, your {{serviceType}} is overdue. Keeping up with maintenance protects your {{vehicleYear}} {{vehicleMake}}. Call {{shopName}} at {{shopPhone}}. Reply STOP to opt out.`,

  twoWeeksOverdue: `Hi {{firstName}}, your {{serviceType}} is now 2 weeks overdue. Don't delay — schedule with {{shopName}} today at {{shopPhone}} or reply BOOK. Reply STOP to opt out.`,

  multiServiceDue: `Hi {{firstName}}, your {{vehicleYear}} {{vehicleMake}} has multiple services coming up: {{serviceList}}. Call {{shopName}} at {{shopPhone}} or reply BOOK to schedule. Reply STOP to opt out.`,

  followUpSatisfaction: `Hi {{firstName}}, thanks for visiting {{shopName}}! How was your recent {{serviceType}}? Reply with any feedback. Reply STOP to opt out.`,

  followUpReview: `Hi {{firstName}}, we hope you're happy with your {{serviceType}} at {{shopName}}! If you have a moment, we'd appreciate a review. Reply STOP to opt out.`,

  // Legacy aliases for backward compatibility
  get firstReminder() { return this.twoWeeksBefore },
  get overdueReminder() { return this.oneWeekOverdue },
};
