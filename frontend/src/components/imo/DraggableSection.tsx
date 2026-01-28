"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";

interface DraggableItem {
  id: string;
  content: React.ReactNode;
}

interface DraggableSectionProps {
  items: DraggableItem[];
  onReorder: (items: DraggableItem[]) => void;
  storageKey?: string;
  className?: string;
}

export function DraggableSection({ 
  items: initialItems, 
  onReorder, 
  storageKey,
  className = "" 
}: DraggableSectionProps) {
  // 只保存顺序（ID列表），不保存内容
  const [itemOrder, setItemOrder] = useState<string[]>(() => initialItems.map(item => item.id));
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const draggedItemRef = useRef<string | null>(null);

  // 从 localStorage 恢复顺序
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const savedOrder = JSON.parse(saved) as string[];
          // 只保留存在的 ID，添加新的 ID 到末尾
          const validOrder = savedOrder.filter(id => 
            initialItems.some(item => item.id === id)
          );
          const newIds = initialItems
            .map(item => item.id)
            .filter(id => !savedOrder.includes(id));
          
          if (validOrder.length > 0) {
            setItemOrder([...validOrder, ...newIds]);
          }
        } catch (e) {
          console.error('Failed to restore layout order:', e);
        }
      }
    }
  }, [storageKey]); // 只在 storageKey 变化时恢复

  // 当 initialItems 的 ID 变化时，更新顺序
  useEffect(() => {
    const currentIds = initialItems.map(item => item.id);
    const newIds = currentIds.filter(id => !itemOrder.includes(id));
    const removedIds = itemOrder.filter(id => !currentIds.includes(id));
    
    if (newIds.length > 0 || removedIds.length > 0) {
      setItemOrder(prev => {
        const filtered = prev.filter(id => currentIds.includes(id));
        return [...filtered, ...newIds];
      });
    }
  }, [initialItems]);

  // 根据顺序和最新内容生成渲染列表
  const orderedItems = useMemo(() => {
    return itemOrder
      .map(id => initialItems.find(item => item.id === id))
      .filter((item): item is DraggableItem => item !== undefined);
  }, [itemOrder, initialItems]);

  // 保存顺序到 localStorage
  const saveOrder = useCallback((newOrder: string[]) => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(newOrder));
    }
  }, [storageKey]);

  const handleDragStart = useCallback((e: React.DragEvent, itemId: string) => {
    setDraggedId(itemId);
    draggedItemRef.current = itemId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
    
    // 添加拖拽时的透明度
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => {
      target.style.opacity = '0.5';
    }, 0);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDraggedId(null);
    setDragOverId(null);
    draggedItemRef.current = null;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedId && draggedId !== targetId) {
      setDragOverId(targetId);
    }
  }, [draggedId]);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    const draggedItemId = draggedItemRef.current;
    if (!draggedItemId || draggedItemId === targetId) {
      setDragOverId(null);
      return;
    }

    const newOrder = [...itemOrder];
    const draggedIndex = newOrder.indexOf(draggedItemId);
    const targetIndex = newOrder.indexOf(targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedItemId);
      setItemOrder(newOrder);
      onReorder(orderedItems);
      saveOrder(newOrder);
    }

    setDragOverId(null);
  }, [itemOrder, orderedItems, onReorder, saveOrder]);

  return (
    <div className={className}>
      {orderedItems.map((item) => (
        <div
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, item.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item.id)}
          className={`
            relative transition-all duration-200 cursor-move
            ${draggedId === item.id ? 'z-10' : ''}
            ${dragOverId === item.id ? 'transform scale-[1.02]' : ''}
          `}
        >
          {/* 拖拽指示条 */}
          {dragOverId === item.id && draggedId !== item.id && (
            <div className="absolute -top-1 left-0 right-0 h-1 bg-[#FF8C00] rounded-full z-20" />
          )}
          
          {/* 拖拽手柄 */}
          <div className="group relative">
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <div className="p-1 bg-white/10 rounded cursor-grab active:cursor-grabbing">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="9" cy="6" r="1.5" />
                  <circle cx="15" cy="6" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="18" r="1.5" />
                  <circle cx="15" cy="18" r="1.5" />
                </svg>
              </div>
            </div>
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
}

// 简化版本：用于侧边栏的垂直拖拽
interface DraggableSidebarProps {
  items: DraggableItem[];
  onReorder: (items: DraggableItem[]) => void;
  storageKey?: string;
}

export function DraggableSidebar({ items: initialItems, onReorder, storageKey }: DraggableSidebarProps) {
  return (
    <DraggableSection
      items={initialItems}
      onReorder={onReorder}
      storageKey={storageKey}
      className="space-y-6"
    />
  );
}

export default DraggableSection;
