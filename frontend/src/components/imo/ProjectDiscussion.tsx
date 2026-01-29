"use client";

import { useState, useEffect, useCallback } from "react";
import { useMultiWallet } from "@/lib/wallet/MultiWalletProvider";
import { getIMOToken } from "@/lib/api/imo";

interface ProjectComment {
  id: string;
  project_id: string;
  wallet: string;
  nickname: string;
  content: string;
  like_count: number;
  created_at: string;
  replies?: ProjectComment[];
}

interface ProjectDiscussionProps {
  projectId: string;
}

export function ProjectDiscussion({ projectId }: ProjectDiscussionProps) {
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<ProjectComment | null>(null);

  const { wallets } = useMultiWallet();
  const token = typeof window !== 'undefined' ? getIMOToken() : null;
  const connectedWallet = wallets.find(w => w.address)?.address;

  // 获取评论列表
  const fetchComments = useCallback(async (isLoadMore = false) => {
    try {
      setLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      const res = await fetch(`${API_URL}/imo/projects/${projectId}/comments?page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          if (isLoadMore) {
            // 加载更多时追加评论
            setComments(prev => [...prev, ...(data.data.items || [])]);
          } else {
            // 首次加载或刷新时替换评论
            setComments(data.data.items || []);
          }
          setTotal(data.data.total || 0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, page]);

  useEffect(() => {
    // page > 1 说明是加载更多
    fetchComments(page > 1);
  }, [fetchComments, page]);

  // 提交评论
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !token) return;

    try {
      setSubmitting(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      const res = await fetch(`${API_URL}/imo/projects/${projectId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
          parent_id: replyTo?.id,
        }),
      });

      if (res.ok) {
        setNewComment("");
        setReplyTo(null);
        // 重置页码并刷新评论列表
        setPage(1);
        setComments([]);
        fetchComments(false);
      } else {
        const data = await res.json();
        alert(data.error || '发送失败');
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
      alert('发送失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除评论
  const handleDelete = async (commentId: string) => {
    if (!confirm('确定删除这条评论吗？')) return;
    if (!token) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      const res = await fetch(`${API_URL}/imo/projects/${projectId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchComments();
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 判断是否可以删除（自己的评论）
  const canDelete = (comment: ProjectComment): boolean => {
    if (!connectedWallet || !comment.wallet) return false;
    return comment.wallet.toLowerCase() === connectedWallet.toLowerCase();
  };

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
      <h3 className="font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-lg">💬</span>
        项目讨论
        <span className="text-sm font-normal text-gray-500 ml-2">
          {total} 条讨论
        </span>
      </h3>

      {/* 发表评论 */}
      {token && connectedWallet ? (
        <form onSubmit={handleSubmit} className="mb-6">
          {replyTo && (
            <div className="mb-2 p-2 bg-white/5 rounded-lg flex items-center justify-between">
              <span className="text-sm text-gray-400">
                回复 <span className="text-[#FF8C00]">{replyTo.nickname}</span>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#FF8C00] to-[#FF6B00] flex items-center justify-center text-white font-bold">
              {connectedWallet.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyTo ? `回复 ${replyTo.nickname}...` : "分享你对这个项目的看法..."}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 resize-none"
                rows={3}
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {newComment.length}/1000
                </span>
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="px-4 py-2 bg-[#FF8C00] text-white font-medium rounded-lg hover:bg-[#FF6B00] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      发送中...
                    </>
                  ) : (
                    '发送'
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg text-center">
          <p className="text-gray-400">
            {!connectedWallet ? '请先连接钱包参与讨论' : '请先登录参与讨论'}
          </p>
        </div>
      )}

      {/* 评论列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#FF8C00] border-t-transparent" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🤔</div>
          <p>还没有人讨论，来发表第一条看法吧</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={() => setReplyTo(comment)}
              onDelete={() => handleDelete(comment.id)}
              canDelete={canDelete(comment)}
              formatTime={formatTime}
              connectedWallet={connectedWallet}
              onDeleteReply={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 加载更多 */}
      {total > comments.length && (
        <div className="text-center mt-4">
          <button
            onClick={() => setPage(p => p + 1)}
            className="text-[#FF8C00] hover:underline"
          >
            加载更多
          </button>
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: ProjectComment;
  onReply: () => void;
  onDelete: () => void;
  canDelete: boolean;
  formatTime: (date: string) => string;
  connectedWallet?: string;
  onDeleteReply: (id: string) => void;
}

function CommentItem({ comment, onReply, onDelete, canDelete, formatTime, connectedWallet, onDeleteReply }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(true); // 默认展开回复

  return (
    <div className="group">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
          {comment.nickname?.slice(0, 2).toUpperCase() || '??'}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white">{comment.nickname || '匿名'}</span>
            <span className="text-xs text-gray-500">{formatTime(comment.created_at)}</span>
          </div>

          {/* Content */}
          <p className="text-gray-300 whitespace-pre-wrap break-words">{comment.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-2 text-sm">
            <button
              onClick={onReply}
              className="text-gray-500 hover:text-[#FF8C00] transition"
            >
              回复
            </button>
            {comment.replies && comment.replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-gray-500 hover:text-white transition"
              >
                {showReplies ? '收起' : `${comment.replies.length} 条回复`}
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="text-gray-500 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
              >
                删除
              </button>
            )}
          </div>

          {/* Replies */}
          {showReplies && comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 pl-4 border-l-2 border-white/10 space-y-3">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="group/reply">
                  <div className="flex gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                      {reply.nickname?.slice(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm">{reply.nickname || '匿名'}</span>
                        <span className="text-xs text-gray-500">{formatTime(reply.created_at)}</span>
                      </div>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap break-words">{reply.content}</p>
                      {connectedWallet && reply.wallet?.toLowerCase() === connectedWallet.toLowerCase() && (
                        <button
                          onClick={() => onDeleteReply(reply.id)}
                          className="text-xs text-gray-500 hover:text-red-500 transition mt-1 opacity-0 group-hover/reply:opacity-100"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectDiscussion;
