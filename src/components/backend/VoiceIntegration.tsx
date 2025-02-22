import React, { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceIntegrationProps {
  onAddCard: (title: string, listTitle?: string, description?: string) => void;
  onAddList: (title: string) => void;
  onEditColumn: (oldTitle: string, newTitle: string) => void;
  onEditCard: (cardTitle: string, columnTitle: string, newTitle: string, newDescription: string) => void;
  onDeleteColumn: (title: string) => void;
  onDeleteCard: (cardTitle: string, columnTitle: string) => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  existingColumns: string[];
  setExistingColumns: (columns: string[]) => void;
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'processing';
  message: string;
}

const WS_URL = 'https://6307-67-217-246-107.ngrok-free.app/';

export const VoiceIntegration: React.FC<VoiceIntegrationProps> = ({ 
  onAddCard, 
  onAddList, 
  onEditColumn, 
  onEditCard, 
  onDeleteColumn, 
  onDeleteCard, 
  isListening, 
  setIsListening, 
  existingColumns = [],
  setExistingColumns 
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const recognitionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const processingToastIdRef = useRef<number | null>(null);
  const toastIdCounter = useRef<number>(0);
  const lastTranscriptRef = useRef<string>('');
  const latestColumnsRef = useRef<string[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'warning' | 'processing', message: string) => {
    if (!message) return; 
    const id = toastIdCounter.current++;
    setToasts(prev => [{ id, type, message }, ...prev]);
    if (type !== 'processing') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    }
    return id;
  }, []);

  useEffect(() => {
    if (existingColumns.length > 0) {
      // console.log('VoiceIntegration columns updated:', existingColumns);
    }
  }, [existingColumns]);

  useEffect(() => {
    latestColumnsRef.current = existingColumns;
  }, [existingColumns]);

  const findExistingColumn = useCallback((columnName: string) => {
    const normalize = (str: string) => str
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
    
    const searchName = normalize(columnName);
    // console.log('Searching for column:', searchName);
    
    // const normalizedColumns = latestColumnsRef.current.map(col => ({
    //   original: col,
    //   normalized: normalize(col)
    // }));
    // console.log('Available columns:', normalizedColumns);

    const match = latestColumnsRef.current.find(col => {
      const normalizedCol = normalize(col);
      const isMatch = normalizedCol === searchName;
      // console.log(`Comparing "${normalizedCol}" with "${searchName}": ${isMatch}`);
      return isMatch;
    });

    if (match) {
      // console.log('Found match:', match);
      return match;
    }

    // console.log('No match found for:', searchName);
    return undefined;
  }, []);

  useEffect(() => {
    if (existingColumns.length > 0) {
    }
  }, [existingColumns]);

  const processServerCommand = useCallback(async (command: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updateColumnsList = (newColumns: string[]) => {
      console.log('Updating columns list:', {
        before: existingColumns,
        after: newColumns
      });
      setExistingColumns(newColumns);
    };

    const cardPattern = /^make card \{(.+?)\} in \{(.+?)\}(?: with description \{(.*?)\})?$/i;
    const columnPattern = /^make column \{(.+?)\}$/i;
    const editColumnPattern = /^rename column \{(.+?)\} to \{(.+?)\}$/i;
    const editCardPattern = /^rename card \{(.+?)\} in \{(.+?)\} to \{(.+?)\} with description \{(.+?)\}$/i;
    const updateCardDescriptionPattern = /^update description for card \{(.+?)\} in \{(.+?)\} to \{(.+?)\}$/i;
    const deleteColumnPattern = /^delete column \{(.+?)\}$/i;
    const deleteCardPattern = /^delete card \{(.+?)\} in \{(.+?)\}$/i;

    console.log('Server response:', command);
    console.log('Current columns:', existingColumns);

    const editColumnMatch = command.match(editColumnPattern);
    if (editColumnMatch) {
      const [, oldName, newName] = editColumnMatch;
      const searchName = oldName.replace(/[{}]/g, '').trim();
      const cleanNewName = newName.replace(/[{}]/g, '').trim();
      
      const existingColumn = existingColumns.find(col => 
        col.toLowerCase().trim() === searchName.toLowerCase().trim()
      );
      
      if (existingColumn) {
        // console.log('Found matching column:', existingColumn);
        await onEditColumn(existingColumn, cleanNewName);

        const updatedColumns = existingColumns.map(col => 
          col === existingColumn ? cleanNewName : col
        );
        updateColumnsList(updatedColumns);
        addToast('success', `Renamed column "${existingColumn}" to "${cleanNewName}"`);
      } else {
        // console.log('Available columns:', existingColumns);
        addToast('error', `Column "${searchName}" not found. Available columns: ${existingColumns.join(', ')}`);
      }
      return;
    }

    try {
      const editCardMatch = command.match(editCardPattern);
      if (editCardMatch) {
        const [, cardName, columnName, newCardName, newDescription] = editCardMatch;
        const cleanCardName = cardName.replace(/[{}]/g, '').trim();
        const cleanNewCardName = newCardName.replace(/[{}]/g, '').trim();
        const cleanDescription = newDescription.replace(/[{}]/g, '').trim();
        const existingColumn = findExistingColumn(columnName);
        
        if (existingColumn) {
          await onEditCard(cleanCardName, existingColumn, cleanNewCardName, cleanDescription);
          addToast('success', `Updated card "${cleanCardName}" to "${cleanNewCardName}" in "${existingColumn}"`);
        } else {
          addToast('error', `Column "${columnName}" not found`);
        }
        return;
      }

      const updateCardDescriptionMatch = command.match(updateCardDescriptionPattern);
      if (updateCardDescriptionMatch) {
        const [, cardName, columnName, newDescription] = updateCardDescriptionMatch;
        const existingColumn = findExistingColumn(columnName);
        if (existingColumn) {
          await onEditCard(cardName, existingColumn, cardName, newDescription);
          addToast('success', `Updated description for card "${cardName}" in "${existingColumn}"`);
        } else {
          addToast('error', `Column "${columnName}" not found`);
        }
        return;
      }

      const deleteColumnMatch = command.match(deleteColumnPattern);
      if (deleteColumnMatch) {
        const [, columnName] = deleteColumnMatch;
        const existingColumn = findExistingColumn(columnName);
        if (existingColumn) {
          await onDeleteColumn(existingColumn);
          setExistingColumns(existingColumns.filter(col => col !== existingColumn));
          addToast('success', `Deleted column "${columnName}"`);
        } else {
          addToast('error', `Column "${columnName}" not found`);
        }
        return;
      }

      const deleteCardMatch = command.match(deleteCardPattern);
      if (deleteCardMatch) {
        const [, cardName, columnName] = deleteCardMatch;
        const cleanCardName = cardName.replace(/[{}]/g, '').trim();
        const existingColumn = findExistingColumn(columnName);
        
        if (existingColumn) {
          await onDeleteCard(cleanCardName, existingColumn);
          addToast('success', `Deleted card "${cleanCardName}" from "${existingColumn}"`);
        } else {
          addToast('error', `Column "${columnName}" not found`);
        }
        return;
      }

      const cardMatch = command.match(cardPattern);
      if (cardMatch) {
        let [, cardName, columnName, description] = cardMatch;
        cardName = cardName.replace(/[{}]/g, '').trim();
        columnName = columnName.replace(/[{}]/g, '').trim();
        description = description ? description.replace(/[{}]/g, '').trim() : '';
        const existingColumn = findExistingColumn(columnName);
        if (existingColumn) {
          await onAddCard(cardName, existingColumn, description);
          addToast('success', `Added card "${cardName}" to "${existingColumn}"`);
        } else {
          addToast('error', `Column "${columnName}" not found. Available columns: ${latestColumnsRef.current.join(', ')}`);
        }
        return;
      }

      const columnMatch = command.match(columnPattern);
      if (columnMatch) {
        const [, columnName] = columnMatch;
        const cleanColumnName = columnName.replace(/[{}]/g, '').trim();
        if (!existingColumns.some(col => col.toLowerCase() === cleanColumnName.toLowerCase())) {
          await onAddList(cleanColumnName);
          setExistingColumns([...existingColumns, cleanColumnName]);
          addToast('success', `Created column "${cleanColumnName}"`);
        } else {
          addToast('warning', `Column "${cleanColumnName}" already exists`);
        }
        return;
      }
      
      addToast('error', 'Command not recognized from server response.');
    } catch (error) {
      console.error('Error processing command:', error);
      addToast('error', `Operation failed: ${(error as Error).message}`);
    }
  }, [addToast, existingColumns, onAddCard, onAddList, onEditColumn, onEditCard, onDeleteColumn, onDeleteCard, setExistingColumns]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        let responseStr = typeof data === 'string' ? data : String(data);
        
        setToasts(prev => prev.filter(t => 
          t.type !== 'processing' && !t.message.startsWith('Sent:')
        ));
        
        await processServerCommand(responseStr);
        setIsListening(false);
      } catch (e) {
        console.error('Error processing WebSocket message:', e);
        addToast('error', 'Invalid response from server');
      }
    };
    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      addToast('error', 'WebSocket connection error');
    };
    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isListening) return;
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setErrorMessage('Speech Recognition is not supported in this browser');
      setIsListening(false);
      return;
    }
    const recognitionInstance = new SpeechRecognitionAPI();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = false;
    recognitionInstance.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      if (finalTranscript) {
        console.log('Sending transcript:', finalTranscript);
        lastTranscriptRef.current = finalTranscript;
        addToast('success', `Sent: ${finalTranscript}`);
        processingToastIdRef.current = addToast('processing', 'Processing') ?? null;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(finalTranscript);
        }
        recognitionInstance.stop();
        setIsListening(false);
      }
    };
    recognitionInstance.onerror = (event: any) => {
      if (event.error === 'aborted') {
        console.warn('Speech recognition aborted - ignoring');
        return;
      }
      console.error('Speech recognition error:', event.error);
      setErrorMessage('Speech recognition error: ' + event.error);
      setIsListening(false);
    };
    recognitionInstance.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };
    recognitionRef.current = recognitionInstance;
    try {
      recognitionInstance.start();
    } catch (e) {
      console.error('Error starting speech recognition:', e);
      setIsListening(false);
    }
    return () => {
      try {
        recognitionInstance.stop();
      } catch (e) {}
      recognitionRef.current = null;
    };
  }, [isListening, addToast, setIsListening]);

  return (
    <>
      {errorMessage && <div className="fixed bottom-20 right-4 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-md text-sm z-50">{errorMessage}</div>}
      {toasts.map((toast, index) => (
        <div key={toast.id}
          className={`fixed right-4 bg-opacity-10 border px-4 py-2 rounded-md text-sm z-[100]
            transition-all duration-300 ease-in-out transform translate
            ${toast.type === 'success' ? 'bg-green-500 border-green-500 text-green-500' : ''}
            ${toast.type === 'error' ? 'bg-red-500 border-red-500 text-red-500' : ''}
            ${toast.type === 'warning' ? 'bg-yellow-500 border-yellow-500 text-yellow-500' : ''}
            ${toast.type === 'processing' ? 'bg-blue-500 border-blue-500 text-blue-500' : ''}
            animate-slideIn`}
          style={{ 
            bottom: `${140 + (10 * index)}px`,
            opacity: 1,
            animation: 'slideIn 0.3s ease-out'
          }}>
          <div className="flex items-center">
            <span>{toast.message}</span>
          </div>
        </div>
      ))}
    </>
  );
};

export default VoiceIntegration;
