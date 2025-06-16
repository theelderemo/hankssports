
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage, GroundingSource } from '../types';
import { SendIcon } from './icons/SendIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { LinkIcon } from './icons/LinkIcon';
import { CHAT_SYSTEM_INSTRUCTION, GEMINI_CHAT_MODEL, API_KEY_ERROR_MESSAGE } from '../constants';
import type { Chat, GenerateContentParameters, Tool } from '@google/genai'; // Added GenerateContentParameters, Tool
import { initializeChatSession, sendMessageToChatSdk } from '../services/geminiService';


interface ChatWidgetProps {
  apiKeyValid: boolean;
  apiKey: string | undefined;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ apiKeyValid, apiKey }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatInstance, setChatInstance] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const initChat = useCallback(async () => {
    if (apiKeyValid && apiKey && !chatInstance) { // Initialize only if valid, key exists, and no instance yet
      try {
        setChatError(null);
        const tools: Tool[] = [{ googleSearch: {} }];
        const thinkingConfig: GenerateContentParameters['config']['thinkingConfig'] = { thinkingBudget: 0 };
        
        const chat = await initializeChatSession(
          GEMINI_CHAT_MODEL,
          CHAT_SYSTEM_INSTRUCTION,
          tools, 
          thinkingConfig
        );
        setChatInstance(chat);
        setMessages([{
            id: Date.now().toString(),
            text: "Yo Hank! What's the latest? Spill the tea on Colts or Thunder, or ask me anything sports, my dude!",
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString()
        }]);
      } catch (error: any) {
        console.error("Failed to initialize chat:", error);
        let specificError = `Failed to start chat: ${error.message || 'Unknown error'}`;
        if (error.message && (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID") )) {
            specificError = API_KEY_ERROR_MESSAGE;
        }
        setChatError(specificError);
         // Provide a bot message indicating the chat issue due to API key
        setMessages([{
            id: Date.now().toString(),
            text: `Can't chat rn, Hank. Looks like a problem: ${specificError === API_KEY_ERROR_MESSAGE ? "API Key might be acting up." : "Chat service isn't working."} Tell Chris to check it!`,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } else if (!apiKeyValid && !chatInstance) { // If API key is invalid from the start and no chat instance
        setChatError(API_KEY_ERROR_MESSAGE);
        setMessages([{
            id: Date.now().toString(),
            text: "Can't chat rn, Hank. API key's MIA or acting up. Tell Chris to fix it!",
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString()
        }]);
    } else if (apiKeyValid && apiKey && chatInstance) {
        // Chat already initialized, do nothing or maybe clear error if one was set previously
        if(chatError) setChatError(null);
    }
  }, [apiKeyValid, apiKey, chatInstance, chatError]); // Added chatError to dependencies


  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    initChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initChat]); // initChat is memoized, so this runs when its dependencies change

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isBotTyping || !chatInstance || !apiKeyValid) {
        if(!apiKeyValid || !chatInstance) {
            setChatError(API_KEY_ERROR_MESSAGE + " Cannot send message.");
        }
        return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsBotTyping(true);
    setChatError(null);

    try {
      const response = await sendMessageToChatSdk(chatInstance, inputMessage);
      
      const botMessageText = response.text;
      const botSources = response.sources;

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botMessageText || "Got nothing, fam. Try again?",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
        sources: botSources,
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      let errorMessageText = `Bruh, error: ${error.message || 'Unknown issue'}. Try again later?`;
      if (error.message && (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID"))) {
          errorMessageText = API_KEY_ERROR_MESSAGE + " Message failed.";
          setChatError(API_KEY_ERROR_MESSAGE); // Set chatError state as well for the banner
      } else {
          setChatError(errorMessageText); // Set general error for the banner
      }
      const errorBotMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: errorMessageText,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, errorBotMessage]);
    } finally {
      setIsBotTyping(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      handleSendMessage();
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl shadow-2xl flex flex-col h-[calc(100vh-200px)] max-h-[700px] border border-slate-700">
      <header className="p-4 border-b border-slate-700">
        <h2 className="text-xl font-semibold text-sky-400 text-center">Chat with Hank's Sports Assistant</h2>
      </header>

      <div className="flex-grow p-4 space-y-4 overflow-y-auto">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] p-3 rounded-xl shadow
                ${msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-slate-700 text-slate-200 rounded-bl-none'
                }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              {msg.sender === 'bot' && msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-600">
                  <p className="text-xs text-slate-400 mb-1">Sources:</p>
                  <ul className="space-y-1">
                    {msg.sources.map((source, index) => (
                       <li key={index} className="flex items-center text-xs">
                         <LinkIcon className="h-3 w-3 mr-1.5 text-sky-400 flex-shrink-0" />
                         <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline truncate" title={source.uri}>
                           {source.title || source.uri}
                         </a>
                       </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400 text-left'}`}>
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}
        {isBotTyping && (
          <div className="flex justify-start">
            <div className="max-w-[70%] p-3 rounded-lg bg-slate-700 text-slate-200 rounded-bl-none shadow">
              <div className="flex items-center">
                <SpinnerIcon className="h-4 w-4 mr-2 animate-spin text-sky-400" />
                <p className="text-sm italic">Hank's Assistant is typing...</p>
              </div>
            </div>
          </div>
        )}
         {chatError && ( // Display persistent error message at the bottom of chat
          <div className="p-3 my-2 rounded-lg bg-red-800 border border-red-700 text-red-100 text-sm shadow text-center">
            {chatError}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={!apiKeyValid || !chatInstance ? "Chat disabled: API Key issue" : "wtf do you wanna know Hank"}
            disabled={isBotTyping || !apiKeyValid || !chatInstance}
            className="flex-grow p-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={isBotTyping || !inputMessage.trim() || !apiKeyValid || !chatInstance}
            className="p-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors transform active:scale-90"
            title={!apiKeyValid || !chatInstance ? "Chat disabled" : "Send message"}
          >
            <SendIcon className="h-6 w-6" />
          </button>
        </div>
      </footer>
    </div>
  );
};