import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function CommentsThread({ changeOrder, onUpdate }) {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const addCommentMutation = useMutation({
    mutationFn: async (comment) => {
      const comments = changeOrder.comments || [];
      const updatedComments = [
        ...comments,
        {
          comment,
          author: currentUser?.email || 'Unknown',
          created_at: new Date().toISOString()
        }
      ];

      await base44.entities.ChangeOrder.update(changeOrder.id, {
        comments: updatedComments
      });

      // Send notifications
      await base44.functions.invoke('notifyStatusChange', {
        entity_type: 'ChangeOrder',
        entity_id: changeOrder.id,
        event_type: 'comment_added',
        message: `New comment on CO-${changeOrder.co_number}: ${comment.substring(0, 100)}...`
      });

      return updatedComments;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      toast.success('Comment added');
      setNewComment('');
      onUpdate();
    },
    onError: () => {
      toast.error('Failed to add comment');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  const comments = changeOrder.comments || [];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare size={16} />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="bg-zinc-800 border-zinc-700"
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!newComment.trim() || addCommentMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
              size="sm"
            >
              <Send size={14} className="mr-2" />
              {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </form>

        {/* Comments List */}
        {comments.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">No comments yet</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {comments.map((comment, idx) => (
              <div key={idx} className="p-3 bg-zinc-800/50 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">{comment.author}</span>
                  <span className="text-xs text-zinc-500">
                    {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                  {comment.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}