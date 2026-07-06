export type HelperQualification = "TRAINER" | "AUFSICHT" | "RETTUNGSSCHWIMMER";

export const HELPER_QUALIFICATION_LABELS: Record<HelperQualification, string> = {
  TRAINER: "Trainer",
  AUFSICHT: "Aufsicht",
  RETTUNGSSCHWIMMER: "Rettungsschwimmer",
};

export interface Helper {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  qualifications: HelperQualification[];
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HelperInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  qualifications: HelperQualification[];
  notes?: string | null;
  is_active?: boolean;
}
