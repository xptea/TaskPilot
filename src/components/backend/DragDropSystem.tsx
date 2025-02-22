import React, { useState } from 'react';
import { DropResult, DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

export interface CardType {
  id: string;
  title: string;
  description: string;
}

export interface ColumnType {
  id: string;
  title: string;
  cards: CardType[];
  order: number;
}

interface UseDragDropSystemProps {
  columns: ColumnType[];
  setColumns: (columns: ColumnType[] | ((prevColumns: ColumnType[]) => ColumnType[])) => void;
  userId: string;
  boardId: string;
}

export const useDragDropSystem = ({ columns, setColumns, userId, boardId }: UseDragDropSystemProps) => {
  const updateColumnOrder = async (newColumns: ColumnType[]) => {
    if (!userId) return;

    const batch = writeBatch(db);
    newColumns.forEach((column, index) => {
      const columnRef = doc(db, `users/${userId}/boards/${boardId}/columns`, column.id);
      batch.update(columnRef, { order: index });
    });
    await batch.commit();
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, type } = result;
    
    if (!destination || !userId) return;

    if (destination.droppableId === source.droppableId && 
        destination.index === source.index) {
      return;
    }

    if (type === 'COLUMN') {
      const newColumns = Array.from(columns);
      const [moved] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, moved);

      setColumns(newColumns);
      await updateColumnOrder(newColumns);
      return;
    }

    if (type === 'CARD') {
      const sourceColumnIndex = columns.findIndex(c => c.id === source.droppableId);
      const destColumnIndex = columns.findIndex(c => c.id === destination.droppableId);

      if (sourceColumnIndex === -1 || destColumnIndex === -1) return;

      const sourceColumn = columns[sourceColumnIndex];
      const destColumn = columns[destColumnIndex];

      const sourceCards = Array.from(sourceColumn.cards || []);
      const [movedCard] = sourceCards.splice(source.index, 1);

      const destCards =
        source.droppableId === destination.droppableId
          ? sourceCards
          : Array.from(destColumn.cards || []);
      
      destCards.splice(destination.index, 0, movedCard);

      const batch = writeBatch(db);

      const sourceColumnRef = doc(db, `users/${userId}/boards/${boardId}/columns`, sourceColumn.id);
      batch.update(sourceColumnRef, { cards: sourceCards });

      if (source.droppableId !== destination.droppableId) {
        const destColumnRef = doc(db, `users/${userId}/boards/${boardId}/columns`, destColumn.id);
        batch.update(destColumnRef, { cards: destCards });
      }

      await batch.commit();

      setColumns(prevColumns => {
        const newColumns = Array.from(prevColumns);
        newColumns[sourceColumnIndex] = { ...sourceColumn, cards: sourceCards };
        if (source.droppableId !== destination.droppableId) {
          newColumns[destColumnIndex] = { ...destColumn, cards: destCards };
        }
        return newColumns;
      });
    }
  };

  return {
    onDragEnd,
  };
};

interface Column {
  id: string;
  title: string;
}

const initialColumns: Column[] = [
  { id: 'col-1', title: 'Column 1' },
  { id: 'col-2', title: 'Column 2' },
  { id: 'col-3', title: 'Column 3' },
];

export const HorizontalDragDropColumns: React.FC = () => {
  const [columns, setColumns] = useState<Column[]>(initialColumns);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newColumns = Array.from(columns);
    const [removed] = newColumns.splice(result.source.index, 1);
    newColumns.splice(result.destination.index, 0, removed);
    setColumns(newColumns);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="columns" direction="horizontal" type="COLUMN">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            style={{ display: 'flex', padding: 8, overflow: 'auto' }}
          >
            {columns.map((column, index) => (
              <Draggable key={column.id} draggableId={column.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      userSelect: 'none',
                      padding: 16,
                      margin: '0 8px 0 0',
                      minHeight: '50px',
                      flexShrink: 0,
                      backgroundColor: snapshot.isDragging ? '#263B4A' : '#456C86',
                      color: 'white',
                      ...provided.draggableProps.style,
                    }}
                  >
                    {column.title}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
