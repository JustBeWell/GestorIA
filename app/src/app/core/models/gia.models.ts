export interface GiaFileItem {
  id: string;
  nombre_original: string;
  mime_type: string;
  tamano_bytes: number;
  tipo: 'upload' | 'pdf' | 'image' | 'text';
  download_url: string;
  created_at: string;
}

export interface GiaMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  files: GiaFileItem[];
}

export interface GiaConversationSummary {
  id: string;
  titulo: string;
  updated_at: string;
  last_message: string | null;
  message_count: number;
}

export interface GiaConversationDetail {
  id: string;
  titulo: string;
  created_at: string;
  updated_at: string;
  messages: GiaMessageItem[];
  files: GiaFileItem[];
}

export interface GiaMessageResponse {
  conversation: GiaConversationSummary;
  user_message: GiaMessageItem;
  assistant_message: GiaMessageItem;
  generated_files: GiaFileItem[];
}

export type GiaMode = 'respuesta' | 'pdf' | 'imagen';
