import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TEMPLATES } from "@/lib/template-engine";

export default async function ReminderSettingsPage() {
  const { userId, orgId } = await auth();
  
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
  });

  const serviceTypes = await prisma.serviceType.findMany({
    where: { orgId },
    orderBy: { displayName: "asc" },
  });

  // Seed default service types if none exist
  const defaultServiceTypes = [
    { name: "oil_change_conventional", displayName: "Oil Change (Conventional)", defaultMileageInterval: 5000, defaultTimeIntervalDays: 90, reminderLeadDays: 14 },
    { name: "oil_change_synthetic", displayName: "Oil Change (Synthetic)", defaultMileageInterval: 7500, defaultTimeIntervalDays: 180, reminderLeadDays: 14 },
    { name: "tire_rotation", displayName: "Tire Rotation", defaultMileageInterval: 7500, defaultTimeIntervalDays: 180, reminderLeadDays: 14 },
    { name: "state_inspection", displayName: "State Inspection", defaultMileageInterval: null, defaultTimeIntervalDays: 365, reminderLeadDays: 30 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Reminder Settings</h1>

      {/* Global Toggle */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Enable SMS Reminders</h2>
            <p className="text-sm text-gray-500">
              Turn on automatic SMS reminders for all customers who have opted in.
            </p>
          </div>
          <form action="/api/settings/toggle-reminders" method="POST">
            <button
              type="submit"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                org?.reminderEnabled ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  org?.reminderEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </form>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-semibold mb-4">Quiet Hours</h2>
        <p className="text-sm text-gray-500 mb-4">
          SMS messages will not be sent during these hours.
        </p>
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start</label>
            <select
              defaultValue={org?.reminderQuietStart || 21}
              className="border rounded-lg px-3 py-2"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End</label>
            <select
              defaultValue={org?.reminderQuietEnd || 9}
              className="border rounded-lg px-3 py-2"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Service Types */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Service Types</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700">
            + Add Custom Type
          </button>
        </div>
        <div className="divide-y">
          {serviceTypes.length === 0 ? (
            <div className="p-4 text-gray-500">
              No service types configured. Defaults will be created on first setup.
            </div>
          ) : (
            serviceTypes.map((type) => (
              <div key={type.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{type.displayName}</p>
                  <p className="text-sm text-gray-500">
                    Every {type.defaultMileageInterval?.toLocaleString()} miles or {type.defaultTimeIntervalDays} days
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    Remind {type.reminderLeadDays} days before
                  </span>
                  <button className="text-sm text-gray-600 hover:text-gray-900">
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Default Templates Preview */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Default Message Templates</h2>
        </div>
        <div className="divide-y">
          <div className="p-4">
            <p className="font-medium mb-2">First Reminder</p>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              {DEFAULT_TEMPLATES.firstReminder}
            </p>
          </div>
          <div className="p-4">
            <p className="font-medium mb-2">Due Date Reminder</p>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              {DEFAULT_TEMPLATES.dueDateReminder}
            </p>
          </div>
          <div className="p-4">
            <p className="font-medium mb-2">Overdue Reminder</p>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              {DEFAULT_TEMPLATES.overdueReminder}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
