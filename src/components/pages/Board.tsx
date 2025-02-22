import { useState, useEffect } from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../backend/firebase';
import { useAuth } from '../backend/AuthContext';
import Column from '../backend/Column';
import { v4 as uuidv4 } from 'uuid';
import { useDragDropSystem, ColumnType, CardType } from '../backend/DragDropSystem';
import VoiceIntegration from '../backend/VoiceIntegration';

interface BoardViewProps {
  boardId: string;
  onTrelloImport?: () => void;
}

const BoardView = ({ boardId, onTrelloImport }: BoardViewProps) => {
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [board, setBoard] = useState<{ title: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [existingColumns, setExistingColumns] = useState<string[]>([]);
  const { user } = useAuth();
  
  const [isHorizontal, setIsHorizontal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      setIsHorizontal(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (!user || !boardId) return;

    const boardRef = doc(db, `users/${user.uid}/boards/${boardId}`);
    const unsubscribeBoard = onSnapshot(boardRef, (doc) => {
      if (doc.exists()) {
        setBoard(doc.data() as { title: string });
      }
    });

    const columnsRef = collection(db, `users/${user.uid}/boards/${boardId}/columns`);
    const q = query(columnsRef);
    
    const unsubscribeColumns = onSnapshot(q, (snapshot) => {
      const columnsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ColumnType[];
      
      const sortedColumns = columnsData.sort((a, b) => a.order - b.order);
      setColumns(sortedColumns);
      
      const currentColumnTitles = sortedColumns.map(col => col.title);
      setExistingColumns(currentColumnTitles);
      
      setIsLoading(false);
    });

    return () => {
      unsubscribeBoard();
      unsubscribeColumns();
    };
  }, [user, boardId, setExistingColumns]);

  const addColumn = async () => {
    if (!user || !boardId) return;

    try {
      const columnsRef = collection(db, `users/${user.uid}/boards/${boardId}/columns`);
      
      const newColumn = {
        title: 'New Column',
        cards: [],
        order: columns.length || 0,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(columnsRef, newColumn);
      console.log('Column created with ID:', docRef.id); 
    } catch (error) {
      console.error("Error adding column:", error);
    }
  };

  const deleteColumn = async (columnId: string) => {
    if (!user || !boardId) return;
    const columnRef = doc(db, `users/${user.uid}/boards/${boardId}/columns`, columnId);
    await deleteDoc(columnRef);
  };

  const updateColumn = async (columnId: string, newTitle: string) => {
    if (!user || !boardId) return;
    const columnRef = doc(db, `users/${user.uid}/boards/${boardId}/columns`, columnId);
    await updateDoc(columnRef, { title: newTitle });
  };

  const addCardToColumn = async (columnId: string) => {
    if (!user || !boardId) return;
    
    const columnRef = doc(db, `users/${user.uid}/boards/${boardId}/columns`, columnId);
    const column = columns.find(c => c.id === columnId);
    if (!column) return;

    const newCard: CardType = {
      id: uuidv4(),
      title: 'New Card',
      description: ' ',
    };

    await updateDoc(columnRef, {
      cards: [...(column.cards || []), newCard],
    });
  };

  const updateCard = async (columnId: string, cardId: string, updates: Partial<CardType>) => {
    if (!user || !boardId) return;

    const columnRef = doc(db, `users/${user.uid}/boards/${boardId}/columns`, columnId);
    const column = columns.find(c => c.id === columnId);
    if (!column) return;

    const updatedCards = column.cards.map((card: CardType) => 
      card.id === cardId ? { ...card, ...updates } : card
    );

    await updateDoc(columnRef, { cards: updatedCards });
  };

  const deleteCard = async (columnId: string, cardId: string) => {
    if (!user || !boardId) return;

    const columnRef = doc(db, `users/${user.uid}/boards/${boardId}/columns`, columnId);
    const column = columns.find(c => c.id === columnId);
    if (!column) return;

    const updatedCards = column.cards.filter(card => card.id !== cardId);
    await updateDoc(columnRef, { cards: updatedCards });
  };

  const handleAddVoiceCard = async (title: string, columnTitle?: string, description?: string) => {
    if (!user || !boardId) return;

    try {
      if (columnTitle) {
        const normalizedColumnTitle = columnTitle.trim().toLowerCase();
        const matchingColumn = columns.find(column =>
          column.title.trim().toLowerCase() === normalizedColumnTitle
        );

        if (matchingColumn) {
          const updatedCards = [
            ...(matchingColumn.cards || []),
            {
              id: uuidv4(),
              title,
              description: description || '',
            }
          ];
          const columnRef = doc(db, `users/${user.uid}/boards/${boardId}/columns`, matchingColumn.id);
          await updateDoc(columnRef, { cards: updatedCards });
          return;
        } else {
          console.error(`Column "${columnTitle}" not found. Cannot add card.`);
          return;
        }
      }
      const columnsRef = collection(db, `users/${user.uid}/boards/${boardId}/columns`);
      const newColumn = {
        title,
        cards: [],
        order: columns.length || 0,
        createdAt: new Date().toISOString()
      };
      await addDoc(columnsRef, newColumn);
    } catch (error) {
      console.error("Error adding card:", error);
    }
  };

  const handleAddVoiceColumn = async (title: string) => {
    if (!user || !boardId) return;

    try {
      const columnsRef = collection(db, `users/${user.uid}/boards/${boardId}/columns`);
      const newColumn = {
        title,
        cards: [],
        order: columns.length || 0,
        createdAt: new Date().toISOString()
      };

      const tempId = uuidv4();
      setColumns(prev => [...prev, { ...newColumn, id: tempId }]);
      setExistingColumns(prev => [...prev, title]);

      await addDoc(columnsRef, newColumn);
    } catch (error) {
      console.error("Error adding column:", error);
    }
  };

  const handleVoiceEditColumn = async (oldTitle: string, newTitle: string) => {
    const column = columns.find(col => col.title.toLowerCase().trim() === oldTitle.toLowerCase().trim());
    if (column) {
      try {
        await updateColumn(column.id, newTitle);
        const updatedColumns = columns.map(col => ({
          ...col,
          title: col.id === column.id ? newTitle : col.title
        }));
        setColumns(updatedColumns);
        setExistingColumns(updatedColumns.map(col => col.title));
      } catch (error) {
        console.error('Error updating column:', error);
      }
    } else {
      console.error('Column not found:', oldTitle, 'Available columns:', columns.map(c => c.title));
    }
  };

  const handleVoiceEditCard = async (cardTitle: string, columnTitle: string, newTitle: string, newDescription: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const cleanCardTitle = cardTitle.toLowerCase().trim();
    const cleanColumnTitle = columnTitle.toLowerCase().trim();
    
    const column = columns.find(col => col.title.toLowerCase().trim() === cleanColumnTitle);
    if (column) {
      const card = column.cards.find(c => c.title.toLowerCase().trim() === cleanCardTitle);
      if (card) {
        try {
          const cleanNewTitle = newTitle.trim();
          const cleanDescription = newDescription.trim();

          await updateCard(column.id, card.id, { 
            title: cleanNewTitle,
            description: cleanDescription 
          });

          setColumns(prevColumns => 
            prevColumns.map(col => {
              if (col.id === column.id) {
                return {
                  ...col,
                  cards: col.cards.map(c => 
                    c.id === card.id 
                      ? { ...c, title: cleanNewTitle, description: cleanDescription }
                      : c
                  )
                };
              }
              return col;
            })
          );

          console.log('Card updated:', {
            oldTitle: cleanCardTitle,
            newTitle: cleanNewTitle,
            column: cleanColumnTitle
          });
        } catch (error) {
          console.error('Error updating card:', error);
        }
      } else {
        console.error('Card not found:', cleanCardTitle, 'in column:', cleanColumnTitle);
      }
    } else {
      console.error('Column not found:', cleanColumnTitle);
    }
  };

  const handleVoiceDeleteColumn = async (title: string) => {
    const column = columns.find(col => col.title.toLowerCase() === title.toLowerCase());
    if (column) {
      await deleteColumn(column.id);
      const updatedColumns = columns.filter(col => col.id !== column.id);
      setColumns(updatedColumns);
      setExistingColumns(updatedColumns.map(col => col.title));
    }
  };

  const handleVoiceDeleteCard = async (cardTitle: string, columnTitle: string) => {
    const column = columns.find(col => col.title.toLowerCase() === columnTitle.toLowerCase());
    if (column) {
      const card = column.cards.find(c => c.title.toLowerCase() === cardTitle.toLowerCase());
      if (card) {
        await deleteCard(column.id, card.id);
      }
    }
  };

  const { onDragEnd } = useDragDropSystem({
    columns,
    setColumns,
    userId: user?.uid || '',
    boardId,
  });

  const handleMicClick = () => {
    if (isListening) {
      const voiceIntegration = document.querySelector('voice-integration') as any;
      if (voiceIntegration?.processCurrentTranscript) {
        voiceIntegration.processCurrentTranscript();
      }
    }
    setIsListening(!isListening);
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#111111] p-4 flex items-center justify-center">
        <span className="text-[#666666]">Loading board...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#111111] flex flex-col h-screen overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-6 pt-4 pb-6">
        <h2 className="text-white font-medium">{board?.title || 'Loading...'}</h2>
        <div className="flex items-center gap-2">

          {/* 
                <button
                onClick={() => setIsHorizontal(prev => !prev)}
                className="px-2 py-1 border border-gray-500 text-sm rounded text-white hover:bg-gray-800"
                >
                {isHorizontal ? 'Horizontal' : 'Vertical'}
                </button>
          */}
                    {onTrelloImport && (
            <button
              onClick={onTrelloImport}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#222222] hover:bg-[#333333] text-[#666666] hover:text-white transition-colors text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Import
            </button>
          )}
          <div className="relative group">
            <button
              onClick={handleMicClick}
              className={`flex items-center justify-center w-8 h-8 rounded-full 
                ${isListening 
                  ? 'bg-red-500 animate-pulse' 
                  : 'bg-[#222222] hover:bg-[#333333]'} 
                transition-all duration-200`}
              title="Voice Commands"
            >
              <svg 
                className={`w-4 h-4 ${isListening ? 'text-white' : 'text-[#666666]'} transition-colors`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a1a] rounded-md shadow-lg p-3 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 text-sm z-50">
              <div className="text-white font-medium mb-2">Voice Commands:</div>
              <div className="text-[#999999] space-y-3">
                <div>
                  <div className="text-[#666666] text-xs uppercase mb-1">Adding Cards to Lists:</div>
                  <ul className="space-y-1 list-disc pl-4">
                    <li>"Add a card called Bug Fix in Test column"</li>
                    <li>"Add card Meeting Notes in Planning"</li>
                    <li>"Create card Research in Todo list"</li>
                  </ul>
                </div>
                <div>
                  <div className="text-[#666666] text-xs uppercase mb-1">Creating New Columns:</div>
                  <ul className="space-y-1 list-disc pl-4">
                    <li>"Add column called Ideas"</li>
                    <li>"Create new column Testing"</li>
                    <li>"Make a column Backlog"</li>
                  </ul>
                </div>
                <div>
                  <div className="text-[#666666] text-xs uppercase mb-1">Editing:</div>
                  <ul className="space-y-1 list-disc pl-4">
                    <li>"Edit column Tasks to Todo"</li>
                    <li>"Edit card Bug Fix in Tasks to Fixed Bug with description All done"</li>
                  </ul>
                </div>
                <div>
                  <div className="text-[#666666] text-xs uppercase mb-1">Deleting:</div>
                  <ul className="space-y-1 list-disc pl-4">
                    <li>"Delete column Completed"</li>
                    <li>"Delete card Bug Fix in Tasks"</li>
                  </ul>
                </div>
                <div className="text-xs text-[#666666] mt-2 pt-2 border-t border-[#222222]">
                  Tip: Click the mic button to start/stop listening. Voice commands are processed automatically.
                </div>
              </div>
            </div>
          </div>


          {isHorizontal && (
            <button
              onClick={addColumn}
              className="px-3 py-1.5 rounded bg-[#222222] hover:bg-[#333333] text-[#666666] hover:text-white transition-colors text-sm"
            >
              + Add Column
            </button>
          )}
        </div>
      </div>

      <VoiceIntegration
        onAddCard={handleAddVoiceCard}
        onAddList={handleAddVoiceColumn}
        onEditColumn={handleVoiceEditColumn}
        onEditCard={handleVoiceEditCard}
        onDeleteColumn={handleVoiceDeleteColumn}
        onDeleteCard={handleVoiceDeleteCard}
        isListening={isListening}
        setIsListening={setIsListening}
        existingColumns={existingColumns}
        setExistingColumns={setExistingColumns}
      />
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="all-columns" type="COLUMN" direction={isHorizontal ? 'horizontal' : 'vertical'}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`${
                isHorizontal 
                  ? 'flex gap-4 overflow-x-auto px-6 scrollbar-thin scrollbar-thumb-[#333333] scrollbar-track-[#161616] hover:scrollbar-thumb-[#444444]' 
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-6 overflow-y-auto content-start auto-rows-start'
              } relative flex-1 mb-0`}
              style={{
                minHeight: '100px',
                paddingBottom: isHorizontal ? '0' : '80px'
              }}
            >
              {columns.map((column, index) => (
                <Column
                  key={`${column.id}-${column.title}`}
                  id={column.id}
                  title={column.title}
                  tasks={column.cards || []}
                  index={index}
                  onDelete={deleteColumn}
                  onUpdate={updateColumn}
                  onAdd={addCardToColumn}
                  onUpdateCard={updateCard}
                  onDeleteCard={deleteCard}
                  isHorizontal={isHorizontal}
                />
              ))}
              {provided.placeholder}
              {!isHorizontal && (
                <div className="fixed bottom-0 left-0 right-0 bg-[#111111] p-4 border-t border-[#222222]">
                  <div className="max-w-7xl mx-auto px-4">
                    <button
                      onClick={addColumn}
                      className="w-full py-2 bg-[#222222] hover:bg-[#333333] transition-colors rounded-sm text-[#666666] hover:text-white"
                    >
                      + Add Column
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>

  );
};

export default BoardView;

