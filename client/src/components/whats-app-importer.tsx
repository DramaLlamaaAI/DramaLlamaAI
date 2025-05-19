import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { FileText, XCircle, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import JSZip from "jszip";

interface WhatsAppImporterProps {
  onConversationImport: (text: string, participants: string[]) => void;
}

export default function WhatsAppImporter({ onConversationImport }: WhatsAppImporterProps) {
  const [fileName, setFileName] = useState("");
  const [fileIsZip, setFileIsZip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Function to extract participant names from WhatsApp chat format
  const extractParticipants = (text: string): string[] => {
    if (!text || typeof text !== 'string' || text.length === 0) {
      return [];
    }
    
    // If it's binary data, we can't extract participants
    if (text.startsWith('PK')) {
      console.log("Binary data detected, can't extract participants");
      return [];
    }
    
    try {
      const lines = text.split('\n');
      console.log(`Processing ${lines.length} lines for participant extraction`);
      
      // Common WhatsApp message patterns
      const patterns = [
        // [date, time] Name: Message
        /\[\d+[\/-]\d+[\/-]\d+(?:,|\s+)\s*\d+:\d+(?::\d+)?(?:\s*[AP]M)?\]\s*(.*?):/,
        
        // date, time - Name: Message  
        /\d+[\/-]\d+[\/-]\d+(?:,|\s+)\s*\d+:\d+(?::\d+)?(?:\s*[AP]M)?\s+-\s*(.*?):/
      ];
      
      const participants = new Set<string>();
      
      // Look through the first 200 lines to find participant names
      const linesToCheck = Math.min(lines.length, 200);
      
      for (let i = 0; i < linesToCheck; i++) {
        const line = lines[i];
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const name = match[1].trim();
            
            // Skip system messages
            if (!name.includes('changed the subject') && 
                !name.includes('added') && 
                !name.includes('removed') &&
                !name.includes('left') && 
                !name.includes('joined') &&
                !name.includes('created group')) {
              participants.add(name);
            }
          }
        }
      }
      
      console.log(`Found ${participants.size} participants:`, Array.from(participants));
      return Array.from(participants);
    } catch (error) {
      console.error("Error extracting participants:", error);
      return [];
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setFileName(file.name);
    
    try {
      // Determine if it's a ZIP file
      const isZip = file.name.toLowerCase().endsWith('.zip') || 
                   file.type === 'application/zip' || 
                   file.type === 'application/x-zip-compressed';
      setFileIsZip(isZip);
      
      let chatText = "";
      
      if (isZip) {
        // Process as ZIP file
        try {
          const zipData = await file.arrayBuffer();
          const jszip = new JSZip();
          const zip = await jszip.loadAsync(zipData);
          
          // Find text files in the ZIP
          const textFiles = Object.values(zip.files).filter(f => 
            !f.dir && (f.name.endsWith('.txt') || f.name.includes('chat'))
          );
          
          if (textFiles.length === 0) {
            throw new Error("No text files found in the ZIP archive");
          }
          
          // Use the first text file
          chatText = await textFiles[0].async('string');
          console.log("Successfully extracted text from ZIP file, length:", chatText.length);
        } catch (zipError) {
          console.error("Error processing ZIP:", zipError);
          toast({
            title: "ZIP Processing Failed",
            description: "Could not extract the chat file from the ZIP. Please try a text file.",
            variant: "destructive",
          });
          setIsLoading(false);
          setFileName("");
          return;
        }
      } else {
        // Process as regular text file
        try {
          chatText = await file.text();
          console.log("Successfully read text file, length:", chatText.length);
        } catch (textError) {
          console.error("Error reading text file:", textError);
          toast({
            title: "File Reading Error",
            description: "Could not read the text file. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          setFileName("");
          return;
        }
      }
      
      // Extract participants
      const participants = extractParticipants(chatText);
      
      // Call the callback with the imported data
      onConversationImport(chatText, participants.length >= 2 ? participants : ["Person 1", "Person 2"]);
      
      // Show success message
      toast({
        title: "Chat Imported Successfully",
        description: participants.length >= 2 
          ? `Found ${participants.length} participants. You can edit them below.` 
          : "Please add participants using the form below.",
      });
    } catch (error) {
      console.error("File import error:", error);
      toast({
        title: "Import Failed",
        description: "There was a problem processing your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearFile = () => {
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast({
      title: "File Cleared",
      description: "You can now select a new file.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="border border-dashed rounded-lg p-6 text-center bg-muted/30">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".txt,.zip"
          onChange={handleFileUpload}
          ref={fileInputRef}
          disabled={isLoading}
        />
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <Upload className="h-8 w-8 mb-2 text-primary" />
          <span className="text-sm font-medium">
            {isLoading ? "Uploading..." : "Click to upload WhatsApp chat"}
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            Accept .txt or .zip files from WhatsApp export
          </span>
        </label>
        <Button size="lg" className="mx-auto mt-4 bg-primary text-white" onClick={() => fileInputRef.current?.click()}>
          <FileText className="h-4 w-4 mr-2" />
          Import Chat
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          To export your WhatsApp chat: Open the chat in WhatsApp → Menu (⋮) → More → Export chat → Without media
        </p>
      </div>
      
      {fileName && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-green-600" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{fileName}</span>
              <span className="text-xs text-muted-foreground">{isLoading ? "Processing..." : "Imported successfully"}</span>
            </div>
            {fileIsZip && <Badge className="ml-2 bg-blue-500/80 text-white text-xs">WhatsApp Export</Badge>}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearFile}
            disabled={isLoading}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 mr-2 text-blue-600" />
        <AlertTitle className="text-sm font-medium text-blue-800">Upload Tips</AlertTitle>
        <AlertDescription className="text-xs text-blue-700">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>Export chats from WhatsApp without media for better compatibility</li>
            <li>If you get errors with ZIP files, try the TXT export option</li>
            <li>Make sure your chat has multiple participants for group analysis</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}