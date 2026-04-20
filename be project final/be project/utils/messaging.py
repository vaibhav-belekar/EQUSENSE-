"""
Agent Communication System
Handles message passing between agents
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import json


class Message:
    """Message class for agent communication"""
    
    def __init__(self, sender: str, receiver: str, message_type: str, data: Dict[str, Any]):
        """
        Initialize a message
        
        Args:
            sender: Sender agent name
            receiver: Receiver agent name
            message_type: Type of message
            data: Message data
        """
        self.sender = sender
        self.receiver = receiver
        self.message_type = message_type
        self.data = data
        self.timestamp = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary"""
        return {
            "sender": self.sender,
            "receiver": self.receiver,
            "message_type": self.message_type,
            "data": self.data,
            "timestamp": self.timestamp.isoformat()
        }
    
    def __str__(self) -> str:
        return f"[{self.timestamp}] {self.sender} -> {self.receiver}: {self.message_type}"


class MessageBus:
    """Message bus for agent communication"""
    
    def __init__(self):
        """Initialize message bus"""
        self.messages: List[Message] = []
        self.subscribers: Dict[str, List[str]] = {}  # {agent_name: [subscribed_types]}
    
    def send(self, message: Message):
        """
        Send a message
        
        Args:
            message: Message to send
        """
        self.messages.append(message)
        print(f"[MessageBus] {message}")
    
    def subscribe(self, agent_name: str, message_types: List[str]):
        """
        Subscribe an agent to message types
        
        Args:
            agent_name: Name of the agent
            message_types: List of message types to subscribe to
        """
        self.subscribers[agent_name] = message_types
    
    def get_messages_for(self, agent_name: str, message_type: Optional[str] = None) -> List[Message]:
        """
        Get messages for an agent
        
        Args:
            agent_name: Name of the agent
            message_type: Optional message type filter
        
        Returns:
            List of messages
        """
        if agent_name not in self.subscribers:
            return []
        
        subscribed_types = self.subscribers[agent_name]
        
        messages = [
            msg for msg in self.messages
            if msg.receiver == agent_name or (
                msg.receiver == "ALL" and message_type in subscribed_types
            )
        ]
        
        if message_type:
            messages = [msg for msg in messages if msg.message_type == message_type]
        
        return messages
    
    def clear_messages(self):
        """Clear all messages"""
        self.messages = []


# Global message bus instance
message_bus = MessageBus()

