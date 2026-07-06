export type InquiryStatus = "open" | "answered" | "resolved";
export type MessageSender = "user" | "admin";

export interface ContactInquiry {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  whatsapp_number: string | null;
  message: string;
  event_id: number | null;
  status: InquiryStatus;
  conversation_token: string;
  consent_to_store: boolean;
  delete_at: string;
  created_at: string;
  updated_at: string;
}

export interface ContactInquiryWithEvent extends ContactInquiry {
  event_title: string | null;
}

export interface InquiryMessage {
  id: number;
  inquiry_id: number;
  sender: MessageSender;
  message: string;
  sent_at: string;
}

export interface ContactInquiryDetail extends ContactInquiryWithEvent {
  messages: InquiryMessage[];
}

export interface ContactFormInput {
  first_name?: string;
  last_name?: string;
  email: string;
  whatsapp_number?: string;
  message: string;
  event_id?: number | null;
  consent_to_store?: boolean;
}
