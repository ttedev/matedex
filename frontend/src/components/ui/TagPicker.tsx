import { useState } from 'react';
import { tagsApi } from '../../api/profile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface TagPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function TagPicker({ selectedIds, onChange }: TagPickerProps) {
  const [newTag, setNewTag] = useState('');
  const queryClient = useQueryClient();

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getAll,
  });

  const createTag = useMutation({
    mutationFn: (name: string) => tagsApi.create(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  async function handleAddTag() {
    const name = newTag.trim();
    if (!name) return;
    const tag = await createTag.mutateAsync(name);
    onChange([...selectedIds, tag.id]);
    setNewTag('');
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            className={`px-3 py-1 rounded-full text-label-lg transition-all duration-200 active:scale-95 ${
              selectedIds.includes(tag.id)
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant border border-outline-variant'
            }`}
          >
            {tag.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
          placeholder="Nouveau tag..."
          className="flex-1 px-3 py-2 rounded-lg bg-surface-container border border-outline-variant text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={handleAddTag}
          className="px-3 py-2 bg-surface-container-high rounded-lg text-primary text-label-lg border border-outline-variant"
        >
          + Ajouter
        </button>
      </div>
    </div>
  );
}