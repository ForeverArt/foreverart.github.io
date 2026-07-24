import { useRef } from 'react'
import { Upload, FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface TextInputCardProps {
  text: string
  onTextChange: (text: string) => void
  onLoadSample: () => void
  onUploadFile: (file: File) => void
}

export function TextInputCard({
  text,
  onTextChange,
  onLoadSample,
  onUploadFile,
}: TextInputCardProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await onUploadFile(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText size={16} />
          ① 粘贴听力材料（或上传 .docx）
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder='W: ... / M: ... 对话，含中文提示与英文短文。点"填入示例"看格式。'
          className="w-full min-h-48 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
        <input
          ref={fileRef}
          type="file"
          accept=".docx,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={14} className="mr-1.5" />
            上传 .docx / .txt
          </Button>
          <Button variant="outline" size="sm" onClick={onLoadSample}>
            填入示例
          </Button>
          <span className="text-xs text-muted-foreground">
            旧版 .doc 浏览器读不了，请先在 Word 另存为 .docx 或直接粘贴。
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
