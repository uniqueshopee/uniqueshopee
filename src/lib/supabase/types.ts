export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SupabaseRow = Record<string, Json | undefined>;

export type SupabaseTable<Row extends SupabaseRow = SupabaseRow> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: never[];
};

export type Database = {
  public: {
    Tables: Record<string, SupabaseTable>;
    Views: Record<string, SupabaseTable>;
    Functions: Record<
      string,
      {
        Args: Record<string, Json | undefined>;
        Returns: Json;
      }
    >;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, SupabaseRow>;
  };
};
