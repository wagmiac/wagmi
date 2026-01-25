'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user: {
    id: string;
    nickname: string;
    avatar: string;
  };
  replies?: Comment[];
}

interface CommentSectionProps {
  contentId: string | number;
  lang?: 'zh' | 'en';
  defaultExpanded?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

export default function CommentSection({ contentId, lang = 'zh', defaultExpanded = false }: CommentSectionProps) {
  const { user, token, openLogin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [commentCount, setCommentCount] = useState(0);

  // 获取评论数量
  useEffect(() => {
    fetch(`${API_BASE}/comments/count/${contentId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.count !== undefined) {
          setCommentCount(data.data.count);
        }
      })
      .catch(console.error);
  }, [contentId]);

  // 展开时加载评论
  useEffect(() => {
    if (!expanded) return;
    
    const loadComments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/comments/content/${contentId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setComments(data.data.items || []);
          setCommentCount(data.data.total || 0);
        }
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadComments();
  }, [expanded, contentId]);

  // 刷新评论的函数
  const refreshComments = async () => {
    try {
      const res = await fetch(`${API_BASE}/comments/content/${contentId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setComments(data.data.items || []);
        setCommentCount(data.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to refresh comments:', err);
    }
  };

  // 提交评论
  const handleSubmit = async (parentId?: number) => {
    if (!user || !token) {
      openLogin();
      return;
    }

    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content_id: contentId,
          content: content.trim(),
          parent_id: parentId || undefined,
        }),
      });

      if (res.ok) {
        if (parentId) {
          setReplyContent('');
          setReplyTo(null);
        } else {
          setNewComment('');
        }
        refreshComments();
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // 删除评论
  const handleDelete = async (commentId: number) => {
    if (!token) return;
    if (!confirm(lang === 'zh' ? '确定删除这条评论吗？' : 'Delete this comment?')) return;

    try {
      const res = await fetch(`${API_BASE}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        refreshComments();
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;

    if (diff < 60) return lang === 'zh' ? '刚刚' : 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}${lang === 'zh' ? '分钟前' : 'm ago'}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${lang === 'zh' ? '小时前' : 'h ago'}`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}${lang === 'zh' ? '天前' : 'd ago'}`;
    return date.toLocaleDateString();
  };

  // 渲染单条评论
  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 mt-3' : 'py-4 border-b border-white/5 last:border-0'}`}>
      <div className="flex items-start gap-3">
        {/* 头像 */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF8C00] to-[#00E5FF] flex items-center justify-center text-sm font-medium text-black shrink-0 overflow-hidden">
          {comment.user.avatar ? (
            <Image src={comment.user.avatar} alt="" width={32} height={32} className="w-full h-full object-cover" />
          ) : (
            comment.user.nickname?.charAt(0).toUpperCase() || '?'
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* 用户名 + 时间 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">{comment.user.nickname || 'Anonymous'}</span>
            <span className="text-xs text-gray-500">{formatTime(comment.created_at)}</span>
          </div>

          {/* 评论内容 */}
          <p className="text-sm text-gray-300 break-words">{comment.content}</p>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 mt-2">
            {!isReply && (
              <button
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="text-xs text-gray-500 hover:text-[#FF8C00] transition"
              >
                {lang === 'zh' ? '回复' : 'Reply'}
              </button>
            )}
            {user && String(user.id) === String(comment.user.id) && (
              <button
                onClick={() => handleDelete(comment.id)}
                className="text-xs text-gray-500 hover:text-red-500 transition"
              >
                {lang === 'zh' ? '删除' : 'Delete'}
              </button>
            )}
          </div>

          {/* 回复输入框 */}
          {replyTo === comment.id && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={lang === 'zh' ? '写回复...' : 'Write a reply...'}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(comment.id)}
              />
              <button
                onClick={() => handleSubmit(comment.id)}
                disabled={submitting || !replyContent.trim()}
                className="px-3 py-2 bg-[#FF8C00] text-black text-sm font-medium rounded-lg hover:bg-[#FFAD33] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {submitting ? '...' : (lang === 'zh' ? '发送' : 'Send')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 回复列表 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <div className="border-t border-white/5">
      {/* 折叠按钮 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-3 flex items-center justify-between text-sm hover:bg-white/5 transition"
      >
        <span className="text-gray-400 flex items-center gap-2">
          💬 {lang === 'zh' ? '讨论' : 'Discussion'}
          {commentCount > 0 && (
            <span className="px-2 py-0.5 bg-[#FF8C00]/20 text-[#FF8C00] rounded-full text-xs">
              {commentCount}
            </span>
          )}
        </span>
        <span className="text-gray-500">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* 展开内容 */}
      {expanded && (
        <div className="px-6 pb-4">
          {/* 发表评论 */}
          <div className="mb-4">
            {user ? (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF8C00] to-[#00E5FF] flex items-center justify-center text-sm font-medium text-black shrink-0 overflow-hidden">
                  {user.avatar ? (
                    <Image src={user.avatar} alt="" width={32} height={32} className="w-full h-full object-cover" />
                  ) : (
                    user.nickname?.charAt(0).toUpperCase() || '?'
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={lang === 'zh' ? '分享你的想法...' : 'Share your thoughts...'}
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => handleSubmit()}
                      disabled={submitting || !newComment.trim()}
                      className="px-4 py-2 bg-[#FF8C00] text-black text-sm font-medium rounded-lg hover:bg-[#FFAD33] disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {submitting ? (lang === 'zh' ? '发送中...' : 'Sending...') : (lang === 'zh' ? '发表评论' : 'Post')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={openLogin}
                className="w-full py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:border-[#FF8C00]/50 transition"
              >
                {lang === 'zh' ? '登录后参与讨论' : 'Login to join the discussion'}
              </button>
            )}
          </div>

          {/* 评论列表 */}
          {loading ? (
            <div className="py-8 text-center text-gray-500">
              {lang === 'zh' ? '加载中...' : 'Loading...'}
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {lang === 'zh' ? '暂无评论，来发表第一条吧！' : 'No comments yet. Be the first!'}
            </div>
          ) : (
            <div>
              {comments.map(comment => renderComment(comment))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
