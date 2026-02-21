export const CustomerStatus = {
  overdue: 'overdue',
  due_now: 'due_now',
  due_soon: 'due_soon',
  up_to_date: 'up_to_date',
} as const

export type CustomerStatus = (typeof CustomerStatus)[keyof typeof CustomerStatus]

export const ContactMethod = {
  call: 'call',
  text: 'text',
  email: 'email',
} as const

export type ContactMethod = (typeof ContactMethod)[keyof typeof ContactMethod]

export const FollowUpOutcome = {
  scheduled: 'scheduled',
  not_interested: 'not_interested',
  no_response: 'no_response',
  serviced_elsewhere: 'serviced_elsewhere',
  left_message: 'left_message',
  wrong_number: 'wrong_number',
} as const

export type FollowUpOutcome = (typeof FollowUpOutcome)[keyof typeof FollowUpOutcome]

export const MessageStatus = {
  queued: 'queued',
  sent: 'sent',
  delivered: 'delivered',
  failed: 'failed',
  undelivered: 'undelivered',
} as const

export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus]

export const MessageDirection = {
  outbound: 'outbound',
  inbound: 'inbound',
} as const

export type MessageDirection = (typeof MessageDirection)[keyof typeof MessageDirection]

export const AppointmentStatus = {
  scheduled: 'scheduled',
  confirmed: 'confirmed',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
  no_show: 'no_show',
} as const

export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus]

export const ConsentAction = {
  opt_in: 'opt_in',
  opt_out: 'opt_out',
} as const

export type ConsentAction = (typeof ConsentAction)[keyof typeof ConsentAction]

export const ConsentSource = {
  sms_reply: 'sms_reply',
  manual: 'manual',
  csv_import: 'csv_import',
  signup: 'signup',
} as const

export type ConsentSource = (typeof ConsentSource)[keyof typeof ConsentSource]
