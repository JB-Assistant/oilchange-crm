export const dynamic = 'force-dynamic'
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function RemindersPage() {
  const { userId, orgId } = await auth();
  
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  // Get upcoming reminders
  const upcomingMessages = await prisma.reminderMessage.findMany({
    where: {
      orgId,
      status: "queued",
      scheduledAt: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
      },
    },
    include: {
      customer: true,
    },
    orderBy: {
      scheduledAt: "asc",
    },
    take: 50,
  });

  // Get today's stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayMessages = await prisma.reminderMessage.findMany({
    where: {
      orgId,
      sentAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  const deliveredCount = todayMessages.filter(m => m.status === "delivered").length;
  const failedCount = todayMessages.filter(m => m.status === "failed" || m.status === "undelivered").length;

  // Get org settings
  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SMS Reminders</h1>
        <div className="flex gap-4">
          <a
            href="/settings/reminders"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            Configure Reminders
          </a>
          <a
            href="/settings/sms"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            SMS Settings
          </a>
        </div>
      </div>

      {/* Status Alert */}
      {!org?.reminderEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800">
            <strong>Reminders are disabled.</strong>{" "}
            <a href="/settings/reminders" className="underline">
              Enable reminders
            </a>{" "}
            to start sending SMS notifications.
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Sent Today</p>
          <p className="text-2xl font-bold">{todayMessages.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Delivered</p>
          <p className="text-2xl font-bold text-green-600">{deliveredCount}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-red-600">{failedCount}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Upcoming (7 days)</p>
          <p className="text-2xl font-bold">{upcomingMessages.length}</p>
        </div>
      </div>

      {/* Upcoming Reminders */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Upcoming Reminders</h2>
        </div>
        {upcomingMessages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No upcoming reminders scheduled.
          </div>
        ) : (
          <div className="divide-y">
            {upcomingMessages.map((message) => (
              <div key={message.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {message.customer?.firstName} {message.customer?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {message.customer?.phone}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                    {message.body}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Queued
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(message.scheduledAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
