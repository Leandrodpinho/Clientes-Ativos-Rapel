import React, { useRef } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface ExcelUploadProps {
  onUpload: (file: File) => Promise<void>;
  refreshing: boolean;
}

export function ExcelUpload({ onUpload, refreshing }: ExcelUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file);
      // Reset input to allow same file upload if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="header-actions">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        style={{ display: 'none' }}
      />
      <button 
        className="btn-primary" 
        onClick={handleClick} 
        disabled={refreshing}
        style={{ background: '#059669' }} // Green for secondary action/upload
      >
        <Upload size={18} style={{ animation: refreshing ? 'bounce 1s infinite' : 'none' }} />
        {refreshing ? 'Processando...' : 'Importar Excel'}
      </button>
    </div>
  );
}
