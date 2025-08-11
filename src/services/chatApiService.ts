// src/services/ChatApiService.ts
class ChatApiService {
  private baseUrl = '/api/chat';
  
  private getHeaders() {
    return {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    };
  }

  async markAsRead(conversationId: number) {
    const response = await fetch(`${this.baseUrl}/conversations/${conversationId}/mark-read`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark as read');
    }
    
    return response.json();
  }

  async getUnreadCounts() {
    const response = await fetch(`${this.baseUrl}/unread-counts`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to get unread counts');
    }
    
    return response.json();
  }
}

export const chatApiService = new ChatApiService();