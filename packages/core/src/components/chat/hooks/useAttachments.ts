import { createSignal } from 'solid-js';
import type { Attachment } from '../types';

export interface UseAttachmentsOptions {
  maxAttachments?: number;
  maxSize?: number; // bytes
  acceptedTypes?: string;
  onUpload?: (file: File) => Promise<string>;
}

export function useAttachments(options: UseAttachmentsOptions = {}) {
  const {
    maxAttachments = 10,
    maxSize = 10 * 1024 * 1024, // 10MB
    acceptedTypes,
    onUpload,
  } = options;

  const [attachments, setAttachments] = createSignal<Attachment[]>([]);
  const [isDragging, setIsDragging] = createSignal(false);

  // 验证文件
  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File "${file.name}" is too large. Maximum size is ${formatFileSize(maxSize)}.`;
    }

    if (acceptedTypes) {
      const accepted = acceptedTypes.split(',').map((t) => t.trim());
      const isAccepted = accepted.some((type) => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      });

      if (!isAccepted) {
        return `File "${file.name}" is not an accepted file type.`;
      }
    }

    return null;
  };

  // 添加附件
  const addFiles = async (files: File[]): Promise<string[]> => {
    const errors: string[] = [];
    const currentCount = attachments().length;

    if (currentCount + files.length > maxAttachments) {
      errors.push(`Maximum ${maxAttachments} attachments allowed.`);
      files = files.slice(0, maxAttachments - currentCount);
    }

    const newAttachments: Attachment[] = [];

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
        continue;
      }

      const isImage = file.type.startsWith('image/');
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        file,
        type: isImage ? 'image' : 'file',
        preview: isImage ? URL.createObjectURL(file) : undefined,
        uploadProgress: 0,
        status: 'pending',
      };

      newAttachments.push(attachment);
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);

      // 开始上传
      if (onUpload) {
        for (const attachment of newAttachments) {
          uploadAttachment(attachment);
        }
      }
    }

    return errors;
  };

  // 上传单个附件
  const uploadAttachment = async (attachment: Attachment) => {
    updateAttachment(attachment.id, { status: 'uploading', uploadProgress: 0 });

    try {
      const url = await onUpload!(attachment.file);
      updateAttachment(attachment.id, { status: 'uploaded', uploadProgress: 100, url });
    } catch (error) {
      updateAttachment(attachment.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  };

  // 更新附件
  const updateAttachment = (id: string, updates: Partial<Attachment>) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  // 移除附件
  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  // 清空所有附件
  const clearAttachments = () => {
    const current = attachments();
    for (const a of current) {
      if (a.preview) {
        URL.revokeObjectURL(a.preview);
      }
    }
    setAttachments([]);
  };

  // 拖拽处理
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent): Promise<string[]> => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer?.files || []);
    return addFiles(files);
  };

  // 粘贴处理
  const handlePaste = async (e: ClipboardEvent): Promise<string[]> => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = items
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (files.length > 0) {
      e.preventDefault();
      return addFiles(files);
    }

    return [];
  };

  // 文件选择器
  const openFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    if (acceptedTypes) {
      input.accept = acceptedTypes;
    }

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      await addFiles(files);
    };

    input.click();
  };

  return {
    attachments,
    isDragging,
    addFiles,
    removeAttachment,
    clearAttachments,
    openFilePicker,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handlePaste,
  };
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
