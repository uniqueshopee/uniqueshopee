export type HelpCategory =
  | "Orders"
  | "Payments"
  | "Returns"
  | "Refunds"
  | "Shipping"
  | "Warranty"
  | "Account"
  | "Coupons"
  | "Products"
  | "Technical Support";

export type QuickAction =
  | "Live Chat"
  | "WhatsApp"
  | "Call Support"
  | "Email Support"
  | "Raise Ticket"
  | "Track Existing Ticket";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: HelpCategory;
  tags: string[];
};

export type SupportTicketStatus = "Open" | "Pending" | "Resolved" | "Closed";
export type SupportPriority = "Low" | "Medium" | "High";

export type TicketTimelineItem = {
  id: string;
  title: string;
  description: string;
  time: string;
};

export type SupportTicket = {
  ticketNumber: string;
  issueCategory: HelpCategory;
  priority: SupportPriority;
  status: SupportTicketStatus;
  description: string;
  attachments: string[];
  timeline: TicketTimelineItem[];
};

export const HELP_CATEGORIES: HelpCategory[] = [];
export const POPULAR_TOPICS: Array<{ title: string; description: string; href: string }> = [];
export const FAQS: FaqItem[] = [];
export const SUPPORT_TICKET: SupportTicket = {
  ticketNumber: "",
  issueCategory: "Orders",
  priority: "Low",
  status: "Open",
  description: "",
  attachments: [],
  timeline: [],
};
export const CONTACT_DETAILS = {
  customerCare: "+91 99347 58077",
  businessEmail: "uniqueshopee.official@gmail.com",
  supportEmail: "uniqueshopee.official@gmail.com",
  workingHours: "Mon-Sat, 9:00 AM - 7:00 PM",
  officeAddress: "UniqueShopee support team, available online for fast help.",
};
