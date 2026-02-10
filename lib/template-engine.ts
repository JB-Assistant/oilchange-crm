export function renderTemplate(template: string, data: Record<string, string | number>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    result = result.replace(regex, String(value));
  }
  
  return result;
}

export const DEFAULT_TEMPLATES = {
  firstReminder: `Hi {{firstName}}, this is {{shopName}}. Your {{serviceType}} is coming up around {{dueDate}}. Call us at {{shopPhone}} or reply BOOK to schedule. Reply STOP to opt out.`,
  
  dueDateReminder: `Hi {{firstName}}, your {{serviceType}} is due now! {{shopName}} has openings this week. Call {{shopPhone}} or reply BOOK. Reply STOP to opt out.`,
  
  overdueReminder: `Hi {{firstName}}, your {{serviceType}} is overdue. Keeping up with maintenance protects your {{vehicleYear}} {{vehicleMake}}. Call {{shopName}} at {{shopPhone}}. Reply STOP to opt out.`,
};
