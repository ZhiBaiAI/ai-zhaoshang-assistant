export interface NotificationMessage {
  title: string;
  content: string;
  level?: 'info' | 'warning' | 'critical';
}

export interface Notifier {
  send(message: NotificationMessage): Promise<void>;
}
