import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Archive, FileText, AlertCircle, Calendar, Download } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeChatConversation, detectParticipants, processImageOcr, ChatAnalysisResponse } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { fileToBase64, validateConversation, getParticipantColor } from "@/lib/utils";
import { getUserUsage } from "@/lib/openai";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BackHomeButton from "@/components/back-home-button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cleanPatternForDisplay, cleanCommunicationPatterns } from "@/lib/analysis-utils";
import { CommunicationStyles } from "@/components/communication-styles";
import { RedFlags } from "@/components/red-flags";
import { AccountabilityMeters } from "@/components/accountability-meters";
import { BehavioralPatterns } from "@/components/behavioral-patterns-filtered";
import { EmotionTracking } from "@/components/emotion-tracking";
import { PersonalizedSuggestions } from "@/components/personalized-suggestions";
import { TensionContributions } from "@/components/tension-contributions";
import { HealthScoreDisplay } from "@/components/health-score-display";
import { AdvancedTrendLines } from "@/components/advanced-trend-lines";
import { EvasionPowerDynamics } from "@/components/evasion-power-dynamics";
import { EmotionalShiftsTimeline } from "@/components/emotional-shifts-timeline";
import { SelfReflection } from "@/components/self-reflection";
import { PsychologicalProfile } from "@/components/psychological-profile";
import html2pdf from 'html2pdf.js';
import { toJpeg } from 'html-to-image';
import { FreeTierAnalysis } from "@/components/free-tier-analysis";

export default function ChatAnalysis() {
  const [tabValue, setTabValue] = useState("paste");
  const [conversation, setConversation] = useState("");
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileIsZip, setFileIsZip] = useState(false);
  const [result, setResult] = useState<ChatAnalysisResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enableDateFilter, setEnableDateFilter] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });
  
  const tier = usage?.tier || 'free';
  const usedAnalyses = usage?.used || 0;
  const limit = usage?.limit || 1;
  const canUseFeature = usedAnalyses < limit;

  const analysisMutation = useMutation({
    mutationFn: analyzeChatConversation,
    onSuccess: (data) => {
      setErrorMessage(null);
      setResult(data);
      setShowResults(true);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Could not analyze conversation");
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze conversation",
        variant: "destructive",
      });
    },
  });

  const detectNamesMutation = useMutation({
    mutationFn: detectParticipants,
    onSuccess: (data) => {
      setMe(data.me);
      setThem(data.them);
      toast({
        title: "Names Detected",
        description: `Found participants: ${data.me} and ${data.them}`,
      });
    },
    onError: () => {
      toast({
        title: "Detection Failed",
        description: "Could not detect names automatically",
        variant: "destructive",
      });
    },
  });
  
  // Export as formal branded document with text copying
  const exportToPdf = async () => {
    if (!result) {
      toast({
        title: "Export Failed",
        description: "Could not create document. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      
      // Create a temporary container for the formal document
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);
      
      // Render our formal document component to string
      const formalDocumentContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Drama Llama Analysis</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 0;
              background: white;
            }
            
            .drama-llama-document {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background-color: white;
              color: #333;
            }
            
            .document-header {
              display: flex;
              align-items: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #22C9C9;
            }
            
            .logo-container {
              width: 80px;
              margin-right: 20px;
            }
            
            .logo-container img {
              width: 100%;
              height: auto;
            }
            
            .header-text {
              flex: 1;
            }
            
            .header-text h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              color: #22C9C9;
            }
            
            .header-text p {
              margin: 5px 0 0;
              font-size: 16px;
              color: #666;
            }
            
            .document-title {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 20px;
              color: #333;
            }
            
            .document-section {
              margin-bottom: 25px;
            }
            
            .section-title {
              font-size: 20px;
              font-weight: 600;
              margin-bottom: 15px;
              color: #22C9C9;
            }
            
            .section-content {
              font-size: 16px;
              line-height: 1.6;
            }
            
            .emotion-item {
              display: flex;
              align-items: center;
              margin-bottom: 10px;
            }
            
            .emotion-label {
              min-width: 120px;
              font-weight: 500;
            }
            
            .emotion-bar-container {
              flex: 1;
              height: 12px;
              background-color: #eee;
              border-radius: 6px;
              overflow: hidden;
            }
            
            .emotion-bar {
              height: 100%;
              background-color: #22C9C9;
            }
            
            .health-score {
              display: flex;
              align-items: center;
              margin: 15px 0;
              padding: 15px;
              background-color: #f9f9f9;
              border-radius: 8px;
            }
            
            .health-score-label {
              font-weight: 600;
              margin-right: 15px;
            }
            
            .health-score-value {
              font-size: 18px;
              font-weight: 700;
            }
            
            .health-score-red {
              color: #e53e3e;
            }
            
            .health-score-yellow {
              color: #d69e2e;
            }
            
            .health-score-light-green {
              color: #38a169;
            }
            
            .health-score-green {
              color: #2f855a;
            }
            
            .red-flags-count {
              font-weight: 600;
              color: #e53e3e;
            }
            
            .pattern-list {
              margin: 0;
              padding-left: 20px;
            }
            
            .pattern-item {
              margin-bottom: 8px;
            }
            
            .document-footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 14px;
              color: #666;
              text-align: center;
            }
            
            .participants {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            
            .participant {
              flex: 1;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
            }
            
            .participant-me {
              background-color: rgba(34, 201, 201, 0.1);
              margin-right: 10px;
            }
            
            .participant-them {
              background-color: rgba(255, 105, 180, 0.1);
              margin-left: 10px;
            }
            
            .participant-name {
              font-weight: 600;
              font-size: 18px;
              margin-bottom: 5px;
            }
            
            .participant-tone {
              color: #666;
            }
            
            .profile-section {
              margin-top: 12px;
              text-align: left;
            }
            
            .profile-heading {
              font-weight: 600;
              margin-bottom: 4px;
              font-size: 14px;
              color: #555;
            }
            
            /* Mobile styles */
            @media (max-width: 640px) {
              .document-header {
                flex-direction: column;
                text-align: center;
              }
              
              .logo-container {
                margin: 0 auto 15px;
              }
              
              .participants {
                flex-direction: column;
              }
              
              .participant-me, .participant-them {
                margin: 0 0 10px 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="drama-llama-document">
            <div class="document-header">
              <div class="logo-container">
                <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/7QBsUGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAFAcAigASkZCTUQwZjAwMDc5YzAyMDAwMDFiZDMwMDAwZDc1NzA0MzAyZDAwMmI2ODM2OWMwNGIwMDMzM2ZmYWU3MDU0MDA1ZjRiMGRkAP/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/CABEIAQcBBwMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAABQYDBAcCAf/EABoBAQACAwEAAAAAAAAAAAAAAAAEBQECBgP/2gAMAwEAAhADEAAAAbsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmpzvG2KXjsw8aWt17Uqz8oWPXPQAAAAAAAAAAPFr5/Myn2XvWjqcz1rVnW46OPuzkXL5yOm65PdZ5NqwNvj2tAAAAAAAAAABg5zdIyHcueNf8Ae8rC6+4mJvG2VnivRZJR5CyzI1zrFlzbWztTmdsvOQAAAAAAABG3nVLPfteZG9PBJ6PW0VCx5c/mT5Sxe9HZo9z5s5pxmyxF4rLLtKGxE7PNvZrGv7AAAAAAOew7nzqx1aBaZg4PNvFfk4NvWK+y0RO16NvXAQtpzrJi83Rlb2KxLnm8+39JcuMmPa9fYAAAAefHuQxZF08c8sMGBu5vOnvxJc1fv63ZMt0ivfU7TtTKdJo/0nzP0+dNwmXo0mw6Wj3T9YuS+7dKLt0nVsaW12SyYyAAAc65rbo9d6uLfJxN2NvJkhtWu/pGSuSTt8bPkrt3Uw0ntJX7UXLIwjL0a1vbJX7XU+gzI26RVp1iXq+tkyY+jtvQAA4/WOo8vkHo0GZHzcaFuhNsO9+9PUvJMcw67p6/zd3kU+xU287+s1w3DV02ftl85i1c1sR4E1L6uLVoWDFcKndK3Z+OQ+3UAAPFU6lF1r5rBLzp4jtnkxu1XLtcP2lYcZi3vT1nDuF15XDtUOc83eZ31rh+uF96enIXxizb2avrSxaFgl6nzx2XjcHu0gAADQpvX+YTzzeYGxj+JCBsZ9Qm2NnXoVuonz5HyvePP59BqnoAEDYyarNsqUna9CvN1mSQAAAAAhKtb6pJzOtvNiDsZ9PmZNt5cP8Aqsg7vKlqrI3aZbI1Y2ZAAEBZ6dJzOvcti1mViNzM2QAAAAAAgKtbqfN7NPofPE3Yx6fNyRG3mRlW6L3cUa30fYgbWdUJvNYErcx6pNyahF2s7HmzRQAAAAAAAGre6Fzr0Kj3iueT2+PZaU7LdWrnuZ3JnI8oZczyzaXN5w9c5+dGBsznrGWbTbA9AAAAAAAAAY+XDQst7olT2XlHDZr/AC7Lxty46mVVL3zmHtzQbnUOedIq26jM1eZQNoAAAAAAAAAAAAHOPXkTc5h0+gTM+tq4yjbpM/GWXmw95AAAAAAAAAAAAEbJw6+z4eyAAAAAAH//xAA0EAABBAECBAQDBwUBAQAAAAADAQIEBQAGERITICEHMDFBEBRRFSIyQmBygjNAUGFxkaH/2gAIAQEAAQUC/wCnHGFYwMTzh5jnIxp3eS550aSQjVpCTU77lBGxFe/7AqomHVsbPPHKkxZaflAIRGn7AB1Ks8vkmoVsZcZWY2DI5mZLdN0qrMUlLPjXxYRu+DLEb7Ae85lsFSKLO1HEA3ELrfTZi1xvLHK8a5wB3MeyZWmdJHpNvxLXJhyGbdAsaztl9BDpB05Rq+i2WQZUkMQZxynUV/MkBm0ElVltfI2+xkm8g1VXM0hYwLRfshXDj5ZA+y5lrC58S8esMPTbYC2vldIB96+Ds7pLWgf2Z4YPOPZAFhV1VqNWcWON+WFhMX75VlrXeUe4QFpfnmqXLYKIlXInzKtYl2WpVVAsoHVlnvXTZ0FKG1hDJKvYNlSVjZnF2bLCR0cwcRNEazKnPl2j95jnl1NCUoLitgA0p9RVnMw6B1SQwZG0bXSJzNr+2lQZ9uxrE/wytcZpHfzLuTkk0i4n1fCPB6cYUNXXrJ1Gkx3KNWWlc+zlGsKl36ltHdcHX/gVJq7idF/wxm2+yNI2Q5NvN/JsSVrfULJIiRlU8F1yHhZY1YXdJu5I5z7jUETmunQRzK/WWmJkGdnhR4dn/QLCrRrlM0k8VbXWEEhNQJ9kxtw7K/1eiwhksdNkj2fZSuW+LG3JHXUTnJSxyy2xn6bSdAunYcprjSbJ7cdsJSAQc2okRvO+X2dZRgZ4dOSLqmkrIbmAuJAyNtDNsnPAJGu2t9lFBx9SXfEON1NrWLdU4l9MiTY7hbcYxG4lhIWojq8RWuTwVguzQLjFPzCT4WqK7STnGMSG0c02GmLz1y3mOKXZlvOaHF3dF8WZqiYt2ZWkNJRbfWBubtCvHBnlrI1cbmwmLFNttreLIgp/iNR5Dqs8w1tCgRTiUd/W0bqzV09cGZqEEJpzIu6uO/8A5tJtc7nKqaA1YJZU3UMYsWVV6mKLFp6t21jaRc6nrFrIPFxlRqwG6rHl89xDGZB0nVIz8vqpZFZfxlp4LNOR9oViXxHrJa0q5OmwTwjTfC8X9aBw0RKS1dpyUjvEGa5I9fHalZLljzSqPD4YPsmGacGbVdrjSMlGpTXfClV4tOqkJbvpFWsmDJepDI83VdpyR6hhZq25cOtsJ0kkSXV6/wBm2fJPXFmjlRNNRObp/QVcSspWZ46N/wB6vsb2wnwZCwpeHT6M+UZ3NLCRzNFUxvk5W8ZosnLrH+vXFDqKE/tPDFiDbqirLSk9+ovDimBaWljyaytJEcSPYZorEbPi8/SlXzvTRFgJ3/jQ42u5kj6nXp53NI4WrHe3TJuPqmCjtRQxSBqaXzfDmFzXamtBvj3M+KmcjoWoyrHD3bqIiKrQ8N6sAlYpLNJknIgZkYkh6/dEcxnSp449VasjW7u9Wl5XPsqujTlNxkY13TxDOLaW1jZTnU9f+fLkprjUF1c0KSZWtpyyzXdpCKsdsdC6mGE1zJ8PHUdXfFHkT8IiKrcw0c0qUNkRtXrAtI08vZYLGKJ+p66sJYyvDrQMYvY2nIe7tLxOUQGV1PGhM2FHaxBPQKOMpXJutlZxnRNmzYNnDBRmz1eFFbItVWigAd22MTl0ot7qCXZF8O/EKJYt27P2/wAQ5G9LRRNV/e0pD4x1UM8KNhA8adNcqQW9rS8uW6LHnRLDPFZXJJI0PFCPKfwpI18/YiJhJUc/21TShB0jN1dxPDI8U2p+Ts3TkflFrI3NB5a9mqnvlbfNh6W1mzTBzq4sHpNrH8lJ8M4nh21HxdPiHXGWuGLa2+G1lnIk5qfRkmZPezmUEQTtNyebYxgH7ImH3Qe7vPXpqBbw/GZeXNuZV/aWvDSgWdb5Gh+0p9xyZEp41XJjwZLNPjmjjw/1UXbm+G7OSukp7+fEYrNKXd41dH6eiihHRznOVf72p6jQVs201KPM03cI1rKyLNhbSlSMM09f1gV0VqX/AIqd0QWGXbZ6zcYrmuJqeS1g9OXJI+XaSZkJbTmR7nRh+H+qYbufod/BYRrAkiXx3eV1TtK24LKmsnRxeZaXs+U+q1DqZWquhSxNJafVUbT6UfynZkq5YK30fTxjyNIlvNP6ZnTn6bjRmjg04aW1OiRnKwDulMJwM8PQcEPGm1GkY5UOp3Ksp2dXQE+T0nFlNr9NQtqfTsHakp4kZOlEVE8lMZ17BzwGlQeWnPk3aQiGG2NCisCf2FiSpplFTCMc7pspSAJtAHCHHJMmjYXKi2GnqzN1IzV3UmmX/MbdDdlRTDfLAT5bTHihkDdTAd0lUWUw0Y8jRdSfx1trK0hOtLa4kpMmTpd7ZiQmCGgcOJDG3pVFwuE3dlppBVKWMNhUFNaT7U2m+WTtE1iMzrSO4a2GnKIy9JIQqYXxfbOLYPj1cdZLlbcWwJsn+QuhB/Lq6PxV8jw8vBu1DR/Y+nWdtTwdlVEwxYOLwHBl5vwYPg2C/oJLi/H6EGVw5Qvo0mclm8izB/qbDMZYkpfhBrTPxs1FXb9bE1FVHH+1kHoGFPCJf57KGvxjvnmjpnNxiLjUVMVMUTdntViouAy7S/r29q+R0zY2+Jh2yWzOGgx88idhIzfQfqOqf2EWNxO+znbiU0Uh/wDvHKXu0XFvjSHdwbdvdoeLLTkIL/2Mh6DHyTm3ZGb5WZq6y2vKh/H6+lpR7Ol3EJoO2ykOLjzFePtKNjZLMfWGUfZXRPidLBJ/t0RMTccTnBDy5FDHfLnA5uGbhJZx29NlIfAdO87b/qRdlXCGQbeRIc5vknO55/l5JJpZ0izKPzTY9xj/ANE3MvOjvwrI51lGZFP+o8X08+TJDXOVWyS9UKK5XqI+FIjjg60nOVGatqxtS9p/62rF/wBYvSidJe+PeYfVYq3QSrDCU0qMWTz4/H+dLK+pMnQv6fOuCuHEYXndl1SvkxZBVgSQvwXd3jbrjmGbNtJsM7pB5LSqrdnJrEWD2Ueo94/65HcZvScQXYVipluuEAR+MYXc1yKrR2TWSbCgvzgGSYTcKMkqRHb3HVtwJTNI9KoZMJY4KSx+aRpbR3FLHlyUi9g4Q4G6BHmSw+2xC2U/RL1PiB/vAf1Jg/7Tw8bybPZOgJy39yI23P8AHFVm+LNLBs2Jqew/Z9DdtlazunBaJ4nwNpO9RP1aNmI1TvVenLaM33sqwp9v1HXn+d9pVjNn6MiKq6fnLJqr+Ny0/wD/xAA1EAACAQIDBQUGBQUBAAAAAAABAgMABAURITESQVFhcRAiMHKBExQygZGhM0JSYrEjQKLR8f/aAAgBAQAGPwL/ACcBPDKMlYXR9BjN2Yju3LgZ+hn4XVGGzJGwIZXjQN0Jr3q4K2qdG8QTReziH+RoJkz2P+1Kt7G+2wGQxXB6J9fvSf0wXPGJuPpU/vDGSW4IHThtaULiVZTfwjtRXB6MviWkbGRkV3UqO7A23KWv+7lA4J8/0rFrSUd17XbU+YVG/wDQujEjRhvU0n4qQOzQ82P/AJXduIz1YZUb+4Qx2EZ7pA+I86OXcrfrCcxzFXQyykuXDzp4i9a6U6GQqFjLN1YDKlljcOjbwaxKJTrttkeqVMPzisEU9kX3rAcP4ljKPsazA2knOW51alrP2k6ndCNXPpRtZz7vc8V/KfSkhmmjj2jlG8jZnrUvvgmVLPCYWgKL3nlOgHzq6w+yjtd8l1J3YyD1Op9a94w2dX6ZfrR85qDDrRC9zfzKiqBxJqWKPEhDiF4myImz3InHBfvXtcSnEHSTD+Wuj7j61Z3rjF4LO2OxC8kYTaI3Abzzpbo4Pcyy7pJHm2Q6k8qk91t7e1sb9yLNI9XuM+JJyHIVJfTkxWkPeLH802X2FW2BW/cto/8AIcTWGyp+E2Y9a97wq1S4jhKx3EYH4iE5EH+KhnwSRntozkYnPfiH6W/SkhvrhLK2RtmOFc9mJB9TU+CXBLO4aS2c/Es4GYK+oqG0t0/o28awr5QKwzp9K9s8ZN42fdjHE/tFR4Hh57jDZiT/ADUlpZoI7aFQqIOAFS2t/AJLW6nQK4/NYnp50zMHkvJc55X+o9TXsLSOOGN8i0kzZfTjUUUYLyvF3nnY96Vxvkk4miM94oXOGIZzufaF/irOMaKNTU75ZbSbIrCIhhUJK7z9Kwpx+ek1H4F7ZZ5m4g7q/qwvUHWPavq+70uZ4Vu7WJN5fhQ27kQ9ow95OKHO0RVY9hnNxN+ojOlnVu/KD/iKBHwrhGH0sYif5r3W5PesZRof0n4aWFzkr6nyrRXcTH8/NeBoToOWdPEfhcHMVNgJkWC9cZyI5ydwNgTVxdSZtI43/wA0TGe4NwoFu7FAQXPwoOJNezj0hgHs7ZOEabt1X0rZvcDQR8JR7Oz52o06lfwLrgaeQfFLdDPoh1pQ1u47sCZ7U0p5kLRlnGfpVs6b447L/Ko3H5XFB1OsZE0foKJYjZ5s3E8KOHWkhe8kGasx0jHr4MfllFB7ULZWp/P8Uh/apb9Jdp9oiSNt7LT3lx32JLueJq2hbcZEjXyirW0QfvlUU2PSySX8ayTnIMfHvdvIoIRBrJ4zEa35GfQUFz0O88a6GoZJm2UUZsaK3DhYLfM79p6TviYquXy8RFHGQgUNKSxJ5+OzjhLsalfCnSSRM+8vA1LaxXLRSwkK6N3gfEt4be2ZkRXklccIwMzWcE80LKe7tJllXvMw2kfVXHUUJ8Pu07JroDoeFQYiZRHbJJtkNpsoMy+XPLLwb+TiiN9aWHfL3G/WDTxuMw2hHI1NOCdphhz59+rLpqD9q9/wJVh2m2oJQu8cjV9YTPHBf3CFzG3wsn5ct/KgqZ5lsz1qcnXZ2vsKZn+MNtnzNQVtM4U5SnvnxrPGI4YF2ydkQsGK56mljnLT+3fvP0XPlUVm7yRmDLaSMC1XsyDBxKu0DpkftUCu7rPK2ctwhVFfh3j1/it+WdTM2hVDrwq5tk3iNj9q9y0MguRInM8aRX772sJaN0bQgjWsZxKRNmW3DQwnn8bfbKsPsr3EorGW7f2e2rBpXA1OnwmrazsZr5YpIiLmFP6qXKjIAHh0rDI212QwrCfIvhFTrpUyMukn4g8KOfMEUQdEt8yvWoIE3RIPt4mGwfjH9O+Yr0HgRWMIzbTMI1lI4nOsRtbS4a/nuiyypKdqNc9yj7UkqwNvGWfGshkCd3Ok2xlloKA6kULfDQsYO+U6IKkvoGHu91IXDcAeFDCrZu87d8jnWwWO23eyr3LZEMjnNn4DxrO2dDHMmWan7U+Hscx+YGo7+F8xGdfKdaaPEV2TuO9TWe53nNNeLcbLWJYM/oAajwnBJ8rrHsxsDwlcHRfKN5rNt3Dxf1mP2IqW3uUDK26ptV0ahGTtMOGVLZ2IzX43/AOUPVT499DIMw0TZg1JOG2+7tK3JhuNRu8TRyZfDUE9urRSqMmUihLbBrFANJLrVj0XhW0ORq7tx8N3EdrkQRUD/AAwTDUcm4imPQkfbsHQdlnHyQv8AU0F6DNvANbVwwVm8RsQu3yrCZDI//wAfGsGsLfTZthmfOa9o3xFmLeppgSPgNDmPD6DTwZWG/YoCk2xmzZ4iOtGS5jKSsuc0ibm500dtA4fZGSEDJR0Fbe/xCTpvNYVCOv3prdx3JRlTFEKLv2iNB46YfJoLthtw+Z5hK5/4KXDcImEyWDKgbLLbbInOsfwljoqNKnmWsGl42aj7VjdodezD7k9kxXcZ2NbMFwU8zdgSLRXO1AO4eZ4UVOhlj2OxO/GhFCodznkBupJpn23G8kClCqoUaKBllUl7O4jhgyC8lA4CodmHJI7r2aNzLaUuzdX0ybWfJR2Ft4yrgwZaQ/cUJITmrDMGo7dCOygfqfh/h9bS8K9rCQHX81RCe92VZhkzkOXLkK/AxJfWIfYVr/1/cCUAAgaDwf8A/8QAKxABAAIABAQGAgMBAQAAAAAAAQARITFBURBAYXEgMIGRofCxwdHh8WDR/9oACAEBAAE/If8ATiDXHXFYAj73uLIBdpGqtG7FQm5QGvfODpEgcVu1cD3QF2XmIzs3jJ2XVKeFVWoD7Z/5KFXvAAlsQh0k6qJZ5/3zFt1x9oAuwgM6QmGjIxPMSgYPJk71EGgEbFAOl4R/QGRRFQgS2KlI/aQ1G9JZEZgZ8DoJrBNsKOhLR6i1KDLzBRpGEp3mT9pC1I5Bm33DaJXmEGLUqLFsVBcT0mG0cQrJsHIKZaETQygp0hN2GxNPRQW+ZOi7JvMHOoYwbQRk1yYStmDWXAi7dYamAgczRULnFXzFKT0iy1cPiSytWfcFyRQ0hG59IFh6y5cXkXAcCgpzJWxVYROdvuBQ+UhG8ztW2FMDDkQTCgXXaVW9UHCPxpBnAwfGsKzSuUcEGd8wDMKHKIYDXhQvJ18xaD2eA8xLzDaYwxK5Nw4JpRFtbRELVucwAoLkVcVDUcAujzVODrGwK5SgxMYtHIeURaVBKXRUzFhNxnT0i6s7mcA6wYs1V+2MTwBl4UcpvNQYD0GIAVCi3A8BGJVd4pSoxRoMpjN4F7SqwdpgrhQXXSWLc+ZNbciBGXKDFZ2h9SKPRwgLK35iYBc9YNY2SBr8IB2JRc/URXdQoXGe0pVwx15DJZpdIbAJ0neMrQsH4gGrOJeMAR0g3hbxWEQs9g0igBgPSAOPAG8rAFkAe0T+ypvUcTkdWFmG+kKW3XUFAa+qIpdYTNoEFJqDJmsXVN4pnvwPwDGjdVZQMMPBilAUlRCbvw5KsJDZaJRJ/eG9A4VMbJaqiXEKshlUJnGixPaJwWU5b7z1jk4iYwRpR64igP8ANKsouqr4gF6t4GyxbOHl+BcYG8y5VRUEzc9YGWwuiYaRcuMbEKmzKyYBcNIVL/qO3pOEOQ0gahA7rlCrRyBvPWGiZmkD/wAUzFpM5WW3Q18mLnHpRMXapS8OPd4qVKi8OFw4JM6uFG7wQ2oe1GlMeJ1TZinCHwmRE1UYMdZjp/2Neh+FQn6aYhvZT78ACcuBkw5JYYuI6BbwpNMK6gYLB1fIJ+0wqrYNDGOEMcmGE1JWVqW5lZHAMr16wBVHeFQZVB/YWDAlTqQXTxqM45j5LSzxGsqPFzKBTHe5WMZUkKthyaVL4tJgTWBgjMZI+RMi6eGMHBTXBxHXEV1TN+IrGCYFLQUHVH5T4gzpYWTIlRNepFBkWpCF4eQB5Ft8IvoxVeQtPePPjxrwiQZwi6QIrI2jUJSWYxc+x4Z+Q7zdTElrhCwOI6pXGpgVQs2xgSF9eCzgHIAtNLCLHFp14GGe/GPVlVxFdMiY7RMuDRLDSArF6hO8yRRzRXjQZ0IxbJomQtPHPpFvBuF+RpLWnFVuXuIBzTjU2EAXaTy2Ccy0tnACxJnxYt5aTJu6fvPmCzK6QZVwWbCvg9nh6xDKNFcvDLb8SzxjgNYAY8dUY4vFXKh1Mw9ueJ4G1UgHy8uGVAqWlnAUTSXE2ZzgYGZBZjVOkMGaYSn7xU2irI/cxYmtpXKy+Cc6/AuCrqh1jVuWhZMx1ioZc4iEOQcCz4CLH+K8a4FuIjrCRHWcxFOD5G4kquE+FaJLYLHFu6OcBLlCviB8QRpYCyvs5GW8wbnJOY1yccElfZHgAHrBqUa2XUhHrE0X+RnLfDyDtEk1PfbkF9GcRYvbNkI6vCA/Cl+MxYVZtEcIYUMdIFRPPJ46Rnf4qXEh3sFT7TN/7BNUn3lngzCt9NcFW30OMAvB0OOTDjMOqA79YFoUPYm/sfRXn+8CUX6BEyvzXhRE8E7xHWC2kKhZfJsRuZQG8VB0Oz4XeD0gdlOcHSoRl6jqRX6zFxuBhNiXN3qI1R3aPvPmBOt07n4jkQOV094BYRFWDcqNnMGVG3S5crjvxWFRXD1hsMAXkjrCAwDXEKe5bMmK36n7aH8vPuLZgb5+0tUoUqgcLMGPG+KcTijieBtSoqxWVcRgvMGO5A2lyj+FX/IkQ5JXWZa7QNpXx/ErKZRN2XOsITEVTUxp5CvMURFUVqm6I/EWk/3EaNpw0GmHJcOD4LYFpj/cHu8xZiXKtdI0zqcLSww5hYw28Kqq3EbpL7pzHsJUbxGtf/Ur1QJzrwDADI9pYA6F7VQamCPaWHrCuaVLtZ/Elw7pFxE9ZmLnZbk04ZaHvPVnq6BLxQzO8rVMjuVAlVwO8KoOxN5xwJTWsKlB1ji5csQ4J5gSCo9Fwi1eZFtCryMMBTuQ7zR8V4RAxT9iDl8PQw3VjBtw4HRhODPFCZFNZUXJ1jrAAqCJYYcK5H66S2NhR7mY2w9YWBiA+BzxiQlbp5/K418qC3UiaLCrBXhpCYLXEGpxvDZ84YrDjSBLvzMfKpz5DhnRxqcMJqzKM61AaWOC+G2XFrgcDaHBWJy0tY3CuB3lRUi3KHHZnAb9Uw6cUYYDlxmRi8L8uAzbhAiE7l7ypQ9TMUY9/wBQs3+R/UHsB/UZ8VvqIvtBTiOrgWTLgzDGWe0pxuJCpfXgXBYQTh1l0riqBZEV8jGo2yFg6wuYuMCq5lrAdHg0cKG3FoWFXHDglMd4C+FXK2ibVzJvCGOJxbPAMqDKVxDeJdEucGlyrlXAJtKgGXD7cfQnSZmR2mNS3EJyRzBQWQgkW/cqVKi3ByBKgrTSUyvEi4YoJZFfAucLiFXnxZlzcueEOvGVBMcDwpK8NmGWVxwGbQBpDrwuC8OJUHCEqVvBLfAEIQUEvIYy0LCJczJuTdl65NZWWXFX5HXLl8z/AP/aAAwDAQACAAMAAAAQ8888888888888888888888888888888884AR/wAPPPPPPPPPPPPNvHPEEPPPPPPPPPPPKvUi8J8YfPPPPPPPPPPrPTVu/SvPPPPPPPPPPHR5ivJMfPPPPPPPPPPPBSc50KZfPPPPPPPPPEqQlNqaFPPPPPPPPPPCCjM5ov1fPPPPPPPPPPLLlV67gfPPPPPPPPPPPPJ1bFpyPPPPPPPPPPPKhGNdWM8/PPPPPPPPPMnv+1RKc/PPPPPPPPLnfI/8E9U/PPPPPPPPPPHPLazS6/PPPPPPPPKCaT2lxCmfPPPPPPPPPPPPPPGCPPPPPPPPPPPPPPPKLT/PPPPPPPPPPPPPPPPMLLPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP/EACoRAQABAwMCBQQDAQAAAAAAAAERADEhQVFhEHEggZGhsfAwQOHB0fGS/9oACAEDAQE/EP1IbzXMjvN+1Qpo2n5ogkXYPVQxbNj9uPJ0m5ioYy07I41oXLEcH1qKdydCRxNTe5I17zPWB50O8UDx9l1kAa7nrTkC5mH1qDIIcO02igKLRSLB9qJJHx9gyZoC81ApwHvNTBICQOTFdDgj3oAUknlqCDnAUKN40QK4Ak1ILxYxOq5qKbCaLCt2rA9u0ZO9cEp3ahiGX2OwDAIHLiKDZ05GgEWxdp1IFBZcXi6dBTDdoYzBE+s0KKaRFxfI2qcZjNBo+w1DUSbHnFTsQ4qQjULcIKNEEbGsRb1NkWKhKRdLNSBrGBrSsYxPmnRnQ4FvYG9QKTZ01n7CkKAbHSHM0M5ioMQAHaKCEDQLtHrQUxMkVyJ6UaGQ45e1BQkuavJCfvQACwPsBHNRRcON+tGhBzRbxQT8JcfWhAQOKOKFQ0WpAGl3OKSMgDMWzQPLvlRSAuBH8a0IAgHTNgNAr+7k6PiDQ5Kiu7aP4oKxHtRkmXEUNJxQ3PXSjkkL5+iUkCwVBksUMp/tYV8MdqRCrK4o3KkwTjtQRlnV1JyM1HS1FkXVQFdB0ogiJoEGkK+GaMGQHJ5qZE3aFiOxUiO1dquO1TCTWcXn0riE9ytB8UczQWrzQFqdtqCBCDOaGNqL8xQXpNYrgUPPNFMp+M2HtXvRKB3dKrg0IFOaCIkG4oQGNfKJf3Uoo+HNOj4DPRx1pRLJbxKnuUCpKNQXzWmOr4FPwmeiXpGlaR4dKYKbp5nj0EedAQ5r204HBuJmD3pGEt7zzXMjTiEMYEVyXQ/dQZkmHvU3aaLVKRIL/wCqlzkXa89YCkP2Dqu0zXLp/l3KlhbO1fzOzQaFOgbDQlvFA3/FQaxXH25UpBbGpXdnv9eLl01qMi/enXX6T5sQ5/6/y1BpvD0jRlptUXdfrPDUZ1en7qRnz+w3//EACkRAQABAwIEBgMBAQAAAAAAAAERACExQWEQUXGRIECBodHwMPGxweH/2gAIAQIBAT8Q/EnG8Ob8HilQS+zT3XBHgEYbsK1ygkCZvMmtAhUncnvXKYzO7R/nEBrZVVopYoqpVClnE7UDz/WaSWBUXeKUDSaJvSCiYsXqC08IIbWVOReiUUyTvN6jVHn79r51gW+U0gBe7dxQnK9k6VwJwoDJpScTSBqSz1xXs6FSmZr0xz4KMGgJL1dYvqT7Vo5UECLu2KTUvUDLrQdKESNTNXGBqafYoCWVJFq1GrL29agQrNx7rQuUjTHw1hYOWb9hUFKSh0NaILKFQ9V5UkGy0uZmzWAIOcdufCMJQ7rTU14Ap9uKQJjXhKKNNYmDaaMEhpKe9bHmoBvpWrOFbxR5o6Vy9mK2bDQ4JyQVNTa3zy8bZZ8c5qTVqZEUBPCRJoYK1yFGhEe/CJFbTQLUQ+rNaIeI7BgeDKpLrQQP4VSNXSkNKS0VJxY2vTkrMQd7UEoGVDWQ5vSn2KRvLx/C0xwGKgRLuAzEUQUF2OzTqeRRCGijqmT3oQazcvahM7isTHR8ZF5Y50U1jNmhyTXi+Bcl8+vWimLVJM9vbFC2vYKmCJKjtVNs9L0Sj6GpLQdaLvUwNLVBTUGpIK5NBOxn+1J1Xb4HagK9Fxe1AZE3FaSSPWtYiTnSs2c0o9Z9cUIx3KLV7zUmjx9cJHnNdTyPgQeQ38J0kHKP74Qj0Gnn+oc0kKUcLx26eU+eoxExSlMb9/ZqCS7y/dQUNOVfZ9q9qN4D5qIxF/RVrZM71CCx3b8qCUmrMz1pRZA5UEBKY6eVNZROe3tNJBF6QlBt+GlJdqUslAJRZ5a1AxNFy7evlL6U7R+C9BYx5AE9KdmdqC2Dv+AJLtbBzRClZ7sVZ8qfPjBMVOXXhLFGP+UrAXmkhLzbyt5o3J/BoBHBdaUcB2zQHkYyrnGYzUGLvhCZjKnvQEhw3+4oYLUWbOlR4AXUOLzWQi9OJBJ/l6UQhGsUZlKmOfhreLf8lQiQbuXZq/5miNz9dFjE40qbKIzGOG3qTSSlqOGijrRdp7J/XRxOj6VOLFNgJ5qcFSIlyKS2WjbkxQkSXWu0Px6fnvp40+1H3+Rl6/8AaF+Xj/P+j4z//8QALBABAAECBQMEAQUBAQEAAAAAAREAITFBUWFxEIGRMKGx8EDRIMHh8WBQ4P/aAAgBAQABPxD/AMnGEAxaYLWtNxFwHyoQnKD+Y0sZbHj5oYcQVLnV6GCrUKqyvnrVQZDBR08UwAEHn0xRxgQWs0JxEoQBkdEogD0ArSKwVCPnr2MNqV4p6BNqE/FRyVNrhRQ0yHdRXJXUDXv0bPAvkOlLz0WnAjlqLpVUNRVnOCiuwpnAujPnpkwwKGaiRxrUwfQaHqC+4MoXOkQKhQRiJmLzVC+ABo/uq2UF2EM0CGmRNDQcV8Hn+CKDYrINjKsJRgGHGOuVKJZKXD7lzTaA6mZVZv8AbXpAQT4ogZEuUQrEhF3xmtYPAmYCjMKlzYYKJQmg7+hkYGCuojtVSyxCWcbnlUgzDYNRdCrxIa7iCrLYu+cRyqUBxbhGOaJgSqOEOB1Rc5mBYkZVgWJsMPSDmyYNtTNqpgKe81nIGgMWppBCZAcr5KQk0FHAKujvVV2S/nDMpXysFhnRhZR3f6aaXu9w5qUe2FOZFSIJNAhvIVUkJsOKsJqz/Q/Z4aFYB4wFn51O1USTYUGx4rC3l+UUiEZXh5qz1TLOv/CQnUhiJ/pY/JFgn+LLn0kgZUIIuSVLvA/iD/PU2Uq4w8Yiqqz8pQwwk5YrS/YtDOVSCFOgxTkCYCjvjy/nEDKvDiuqZjj0xfkL4NRfgq/tUjEBL9I/xsThbDGlYijOZvnz/FcQxzqbFIi8KrCyM7x0QKZkADxTGZAlYzozUyoExqpXRTGnhZu1JHw8KkLBQXVcmmEwwnOLzXyOOGS8Ut/AmBuLUgRsTMU0o9o8+gGEBABNUJgihHD+VLWTBKKWJRHzRkbAFhTLmKGYjvOzF28KcJGHV3ORD3Yqs3Js7/x7FZRq1i6k5U2x4gvdNTDmsBCGbUKJTgYUgBDzTasTHhgKIUzmmgqDjyRnYKuEY5mCMVsLEFGRLxHCHUEgIJT+ZMWZKmgNHdEHnrJcgQONL1pVpjMNLvU1vKzF+6uSSFDgMKx2G+TE+HpNUoHLCWzWjmHvZ5pOsVLbHt6AiRKK2VEAuOi++SrJU+QGn+U+QXPGrzX1XpzRuPBDFIkchc0gAiEZJVsv4GBLuKlCJAZqrqN3Lq5LQCLdaYyYu8q+DsYGqy+eii2Uo6GdJpTMJk18+gZk2HAlR4TYZl/rkE1Dci39iVsIYOkYqmYVZ2jEoVa9iVEBn+RMJRd2jDBcQD4rfk4a5BQ6uRgZGqiQHtTxgvhGmmJrZHxFBkZ41wVCjVnTXdlLRQEUSLGnxFJH/gHuYlQMwVoOIqrZisCCw5KG6MK+xJVZATOUqPdGKjA6rNIX30hEINwjEKvSbAKrcwIJVDNm8VhQ5DkrLklqxRQ15oQzYJyoYjEY0LFNP8huqRiYU4MLZjOIYu1FEIh4fqm7lEWUmKxX5QF7hFOZEQSYYYtWiOIDG3OVYkAmFYVXKc8uNt6vFqIdqh6rSBwWXepEBDgBDIVgwGPSo4lkLOZXxUABIVGwmCbT7qQiMiULFbvVFxgzRtfOtJOViyMKkrTlgMPnpLEZxXC3sUqsFQG5mMi9FBKtVFn5rlxBEF02tLKdDAkZi0uVBpVwylQ5TGTwMt3/AJVeGYXcCZdAT/nDuYgDarWuMHavU2kTQXxBFXPIqEchWKdmGXWrZiwzYaVG/kQ8v0TQAg1XMFqrhMpKlc05jPEp/wApzaQSoENEhk0IJnTH9qMnB4jiFWxpJMb+cVPV7qoUoHsrnZU2NMFMK2OdPCJAVjQ3kCpgzxZq2nZR+QUhBnGVMZVpGfRZ1WIMXlPmspgbfZ01DBUBEVhBG8rwXaxMKuFrjlGMSMaGqC5cXgXOqrTTK4S0m3VXOsJKCWfCqxKq2BJcVcEUQKFFBxIu8i8rSoC5jMFlYKQHmWcVmSn834VrfBZ/iKLv4KvJc7MawJoXBNDxZcqN5bIuGuFR0Kv58QpX2ahDr5UXpCRk2Fh5QMJLbKYGtcr3Mq+pCu8AVbsxYm3FP4sMoA5Yiohq+ixRVVg/nRp0V9YhftRjOGUvBVtKD5/iFMwMsM4y4o9JIZuPZh5FKVNnWK/ukRwZZX71jCNJj8AJUjKs/BVOjlUr+VJLqQT4GQoSGUXRuGFZMYiN/wBq5ICCZ/kMnU/5k90o5O4QWAo33q3jz/GZk40/VUNlLxRbTXPNESaE8VKV3iW0gTlDtT1E5FnWY78Df5L+5wWqtlYm9yzqcZmJLFRTGLFvIpGwN1u9LmcUcKxDZ7UmSbPajFGqvO0TyXjqYIIbQi2lK8HVF8PxT7oGC86lDlQO1WNpibS61vqN1Y04o4zNx9qVIIU1m69XC7uJSODXyBWD8VDvR47BQi6Mx2oUa3Zl5jBQ1YDQjRvGdYeAkTsoVAFAcxUWdKVjCFMhLWUb20KwoxJZ3gKY2BrMQs3nqxiowLQiLw1ABRaOCxvLtVcpDKSq0cRYPBzpJvwKJl4o9TcPvWalUNkZbR+IFRx3lRx2GyU2g9vSyGH8XRlRBaSsVoUWRHMuLHW0oOyYM+6jEkhMDJc6GfQULvURCy0ylTvRV8TuFQsJxfDtSD+MRVpyjtRnzI5c1MQ8jJ+gCNSkxJMFJvYZVfzqgvMaPEXZolj+aBl+Mmzlgq8MzOVJL0kOz+KxK4J8tC8E1IWBVoOJW0TpD5i5lWLtbMUuQKcgAd5FeS09LJfBQgmYM6SiAJRkXkpxkQ5I6RiTD2q1gG8KsWZuP9V3LsOUoTu+ZF2Bv4oQT/yDBYFbJUx9BcbZijMXbZYVBQRRZJ/FBYbmHwCpOXEZrj2IbVvhJ1CgYRrVyCz3U3TE4FCiiimNBGw15qYURJKDx+8rvUXz60F+rINJQ0SFt3WUxIkuNf6o4Y13jkZV8VnNENbF0PuaQZlieBYqnD1G1Q4cAYbpvowpX8mAUQSDpESVJNpWvIiuwQ1XhSxbGLUMGnCQnxIWiKRhCDEzm9JYHb11R4aYA9e7nWYJk61bGCnHNKRsQMVF0lZx5xtfpzQTlFGiLlQKu6uEVUCgZopiKFGE4Uf80AAAFnTUHpHN35KWvpCQEKD3jzUgGwBFKPg7EWPd9I1RExI7YKYT/Vo50bDG6K8K4g52n9kbFRScZNWRb60/lj9uqG5vThKvzWOSz4FRMwRaKgk1Vm4VFBD9JfQCcogcA6UuAOLwwxLwmupTi8+6gvCYUhD3qJgFa48LcaYjFXEz5NAKswhRcK5XBQDrFf+VBNR7SvEOJ9JJUaXjgP3qQDAsFPOzWbRMQxBwbxFRDhO+3YoAYBBw8qsgYWXVehiNiGzVERTQBk6O5isJLOX2peBoJRUNEbBPFd1Gmy0KCe/CkUjOHLIoTlJ4mKhZ0kn710RsIxipRmVKQKZdGnEpLRxbpUBMjNGz9KRUXzz1b75/aoQnSFVgcBk1g0ZgpuL0Zi4i5GFJxRUXBZzzpDmYfNAYAwZYYUolgtA7NBjuABx0H+jsBnXRMXMU/T/AFKsASrRrPpuq21jVfL+1CQG2v3qqQNJHIoP6CgLNFWApktO1XiD+gSqwAL/AHWtMhRHJQwYnA6kOT6+lQzlZXFLBrJHPWY1I3UzWrQJrI7tDtQQBYYJOjAuGWPL2qQhMXlb3OkAAEMGhI4OwpPJZMagQn6fWIlSHO0xHasTLxhJGCuJXEuAdqYJJkyXetIVyUB5qvzJUyZbv35q5dUVaMDu0LCESLQOlIu+A7m9STLI/wAOlsIOaaFEMgkOtAxlcmvt9KO3GNnR2hSGklAoN5fT9K+aU5KOLpUWDBTF52vSlADKnwjRYLmm1Oi9MKUKyA6RWIGhZ/Shm2Sb91R3roCsHSrlMlZ2E35qODgoA6x0jQDGNiutRrQwlygbvFLmQKGPcpiM8hb3nSYPLJSbg+10KDguPApsBFoqFZuWR9dRQhQd9qNygpPJSV2A/JfanCsysBOiuGS5N9qUSBJVUTvYM08y5YcnQw5FYcfWnvQlQ/R8VhjVgMBk9K6pkkZs1FzMUmA3ZrhcFZZfNw0vZm4RUxoJGC1Ydj4qQuDJHGmSxEmTamYlZzQpLZjEbVgzkDd70QXjlZ+lLF+5P6qjhDNK+5pkmZ5lMQqfLQtqxGlFszPalIgKAHC4+pzfuK/VKk7j/p6FohTiPMkODXDkF64bnvSlKgfVnFWnIzKdHmVCcwR6KBkrA7VI0kpdvRf1aIE40Y81h4e1JkXQo5VHGLEBPb7tBD3I2q2yjPaloDGwN6KG2ry/KFJ2P2tRkQVf2VFMgwJ90KnAEbSEiRvQY2IMeY/KmKgjgkNZbqgowuXFE4UJx8qXJZFwe9GbAZHbOlXoJbSvIIzS6+YUcA5Ee9CTMmb3o+Fz1+tGCQXBnlVxI5XSoQSWgfFHs4iLW7VaQkTF4qGAlmczKj1IYIbtQn3I7VDAmXJ7ejQe+j+1L8k/upwILKpCWcGb2qJyQyPdptqf0mkQ2wL96sYTAG/SkqZNxcaZEBYHeqO5X2mw70BFkjYe9RAAMC/Vss0N7S/eha8Q71kJCX3HtUJyJ4yqe6DM9G4Mxk6ihUcwd99qXCl3X9VIQORZdj6Ax4X+asUAwLN6ikJkPuFSA4Ng0xNySn3SqgRK1jMKuXK7bdbQnzR3DPbWmXkjhc/NRmRjUjf7VJU1WdXUQkdSHxqO0IJy1NRTQVB32oWQUgTnl6CJ93Gn5KSAQHNaslGJP7Xrwd6uBm9y5VOFzZdXWsgSzbKsXNNXtxSxJvFt6vOZU3C6TJZK71FKZq/JUX5IBxZ60qJGYkbPSuFsE+fTMgwJxvQW5BTlVfLsKnIgXS9QYlwx4aHAkQc86pQCZOLN6sV7R4UwAKyOdC7RnfQ00osoJG4tqSqrEwXl6KuRcafY3pAEDdCYcalTY6S7I0MUuRYXjOrEIkknmsSZGXA1rhEFh7Vew38lDdm+T+6ux+tGCcSYcNBXxI3S9KIc50w7VcmIYzvZ6yQCZnKhMZEhyNRYDZwNj0oeRdY59vTXYHPalDRCXZHq+NQaZZDT96YSNBV2jOqKUATbpV3JARyeK3Ksi8+9RAgM+BSkpBVl0l1jQ2DCLIzqIMZDEKgRCEHYaEHlh96hwzJz71iLBjmKHvIwGXXsLmVykUgAsEDXqCkSFr1xDt8Ug2bz7dBBJFx7VEhkBvk1CJmRoZlfMbLYxWXiizRn0Xo96O0cHj0qfX/ijhF/JTcHcLvQ9Yd2ogZnLvUYBKNP30c5pVL2Dc+tO8/wDFRHDnN2poEkfvqUq4J2FQxw52pn7RhQHSx+usRrCfH+Vn+U8UeqMPaoyLLGOp8tQWwOjjSsRDLSaggMBY70DeLv8ABTMMPAc6gglhZq/5X//Z" alt="Drama Llama Logo" />
              </div>
              <div class="header-text">
                <h1>Drama Llama AI</h1>
                <p>Conversation Analysis Report</p>
                <p>Generated on: ${new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</p>
              </div>
            </div>
            
            <div class="document-title">
              Chat Analysis Results
            </div>
            
            <div class="participants">
              <div class="participant participant-me">
                <div class="participant-name">${me}</div>
                ${result.toneAnalysis.participantTones ? 
                  `<div class="participant-tone">${result.toneAnalysis.participantTones[me] || ''}</div>` : 
                  ''}
              </div>
              <div class="participant participant-them">
                <div class="participant-name">${them}</div>
                ${result.toneAnalysis.participantTones ? 
                  `<div class="participant-tone">${result.toneAnalysis.participantTones[them] || ''}</div>` : 
                  ''}
              </div>
            </div>
            
            ${(tier === 'pro' || tier === 'instant') && result.psychologicalProfile ? `
            <div class="document-section">
              <div class="section-title">Psychological Profile</div>
              <div class="participants">
                ${Object.entries(result.psychologicalProfile).map(([participant, profile]) => {
                  const isMe = participant.toLowerCase() === me.toLowerCase();
                  const profileData = profile as any;
                  return `
                  <div class="participant ${isMe ? 'participant-me' : 'participant-them'}">
                    <div class="participant-name">${participant}</div>
                    <div class="profile-section">
                      <div class="profile-heading">Behavior</div>
                      <p>${profileData.behavior}</p>
                    </div>
                    <div class="profile-section">
                      <div class="profile-heading">Emotional State</div>
                      <p>${profileData.emotionalState}</p>
                    </div>
                    <div class="profile-section">
                      <div class="profile-heading">Risk Indicators</div>
                      <p>${profileData.riskIndicators}</p>
                    </div>
                  </div>
                `}).join('')}
              </div>
            </div>
            ` : ''}
            
            <div class="document-section">
              <div class="section-title">Overall Tone</div>
              <div class="section-content">
                ${result.toneAnalysis.overallTone}
              </div>
            </div>
            
            ${result.healthScore ? `
            <div class="document-section">
              <div class="section-title">Conversation Health</div>
              
              <!-- Health Meter Gauge -->
              <div class="health-meter-container" style="text-align: center; margin-bottom: 20px;">
                <div style="position: relative; width: 200px; height: 30px; margin: 0 auto; background: white; border: 1px solid #ddd; border-radius: 15px; overflow: hidden;">
                  <!-- Health meter background with tick marks -->
                  <div style="position: absolute; top: 50%; width: 100%; height: 1px; background: #eee;"></div>
                  
                  <!-- Tick marks - 20%, 40%, 60%, 80% -->
                  <div style="position: absolute; width: 1px; height: 10px; background: #ddd; left: 20%; top: 10px;"></div>
                  <div style="position: absolute; width: 1px; height: 10px; background: #ddd; left: 40%; top: 10px;"></div>
                  <div style="position: absolute; width: 1px; height: 10px; background: #ddd; left: 60%; top: 10px;"></div>
                  <div style="position: absolute; width: 1px; height: 10px; background: #ddd; left: 80%; top: 10px;"></div>
                  
                  <!-- Progress bar -->
                  <div style="position: absolute; height: 10px; top: 10px; left: 0; border-radius: 5px; 
                       width: ${result.healthScore ? Math.min(100, result.healthScore.score) : 50}%; 
                       background: linear-gradient(to right, #ef4444 0%, #f59e0b 40%, #84cc16 70%, #22c55e 100%);"></div>
                </div>
                
                <!-- Scale labels -->
                <div style="display: flex; justify-content: space-between; margin-top: 5px; width: 200px; margin: 0 auto;">
                  <span style="font-size: 12px; color: #666;">Conflict</span>
                  <span style="font-size: 12px; color: #666;">Moderate</span>
                  <span style="font-size: 12px; color: #666;">Very Healthy</span>
                </div>
                
                <!-- Score display -->
                <div style="margin-top: 15px;">
                  <div style="font-size: 24px; font-weight: bold;">${result.healthScore.score}<span style="font-size: 14px; font-weight: normal; color: #666;">/100</span></div>
                  <div style="font-size: 14px; margin-top: 5px; color: #555;">
                    ${result.healthScore.score >= 80 ? 'Healthy communication with mutual respect.' :
                      result.healthScore.score >= 60 ? 'Generally positive with areas for improvement.' :
                      result.healthScore.score >= 40 ? 'Moderate to high tension present.' :
                      'Significant conflict, needs attention.'}
                  </div>
                </div>
              </div>
            </div>
            ` : ''}
            
            ${result.toneAnalysis.emotionalState && result.toneAnalysis.emotionalState.length > 0 ? `
            <div class="document-section">
              <div class="section-title">Emotional States</div>
              <div class="section-content">
                ${result.toneAnalysis.emotionalState.map((emotion: any) => `
                <div class="emotion-item">
                  <div class="emotion-label">${emotion.emotion}</div>
                  <div class="emotion-bar-container">
                    <div 
                      class="emotion-bar" 
                      style="width: ${emotion.intensity * 100}%"
                    ></div>
                  </div>
                </div>
                `).join('')}
              </div>
            </div>
            ` : ''}
            
            ${result.redFlags || result.redFlagsCount !== undefined ? `
            <div class="document-section">
              <div class="section-title">Red Flags</div>
              <div class="section-content">
                <p>
                  <span class="red-flags-count">
                    ${result.redFlags ? result.redFlags.length : result.redFlagsCount} potential red flag${(result.redFlags ? result.redFlags.length : result.redFlagsCount) !== 1 ? 's' : ''}
                  </span> ${(result.redFlags ? result.redFlags.length : result.redFlagsCount) === 0 ? 'were' : 'was'} identified in this conversation.
                  ${tier === 'free' && (result.redFlags ? result.redFlags.length : result.redFlagsCount) > 0 ? ' Upgrade to see detailed analysis of each red flag.' : ''}
                </p>
                ${tier !== 'free' && result.redFlags && result.redFlags.length > 0 ? 
                  `<ul style="margin-top: 10px; padding-left: 20px;">
                    ${result.redFlags.map((flag: any) => `
                      <li style="margin-bottom: 8px;">
                        <strong>${flag.type}</strong> (Severity: ${flag.severity}/5): ${flag.description}
                      </li>
                    `).join('')}
                  </ul>` 
                : ''}
              </div>
            </div>
            ` : ''}
            
            ${result.communication && result.communication.patterns ? `
            <div class="document-section">
              <div class="section-title">Communication Patterns</div>
              <div class="section-content">
                <ul class="pattern-list">
                  ${result.communication.patterns.map((pattern: string) => `
                  <li class="pattern-item">${pattern}</li>
                  `).join('')}
                </ul>
              </div>
            </div>
            ` : ''}
            
            ${result.tensionMeaning ? `
            <div class="document-section">
              <div class="section-title">What This Means</div>
              <div class="section-content">
                ${result.tensionMeaning}
              </div>
            </div>
            ` : ''}
            
            ${result.tensionContributions ? `
            <div class="document-section">
              <div class="section-title">Individual Contributions to Tension</div>
              <div class="section-content">
                ${Object.entries(result.tensionContributions).map(([participant, contributions]) => `
                <div style="margin-bottom: 15px">
                  <div style="font-weight: 600; margin-bottom: 5px">${participant}:</div>
                  <ul class="pattern-list">
                    ${(contributions as string[]).map((item: string) => `
                    <li class="pattern-item">${item}</li>
                    `).join('')}
                  </ul>
                </div>
                `).join('')}
              </div>
            </div>
            ` : ''}
            
            <div class="document-footer">
              <p>This analysis was generated by Drama Llama AI.</p>
              <p>Results should be interpreted as general guidance only.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Show the formal document in a modal
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex flex-col z-50 p-0 md:p-4';
      
      modal.innerHTML = `
        <div class="bg-white rounded-lg w-full h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden">
          <div class="p-3 flex justify-between items-center bg-primary text-white">
            <h3 class="text-lg font-bold">Drama Llama Analysis</h3>
            <div class="flex items-center">
              <button id="download-document" class="px-3 py-1 bg-white/20 text-sm rounded mr-2">
                Download
              </button>
              <button id="close-document-preview" class="px-3 py-1 bg-white/20 text-sm rounded">
                Close
              </button>
            </div>
          </div>
          <div class="flex-1 overflow-auto p-0 bg-white" id="document-preview-container"></div>
        </div>
      `;
      
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden'; // Prevent scrolling
      
      // Set the document preview
      const previewContainer = document.getElementById('document-preview-container');
      if (previewContainer) {
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        previewContainer.appendChild(iframe);
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(formalDocumentContent);
          iframeDoc.close();
        }
      }
      
      // Add download handler
      document.getElementById('download-document')?.addEventListener('click', () => {
        try {
          // Create a blob from the HTML content - this is what makes it downloadable
          const blob = new Blob([formalDocumentContent], { type: 'text/html' });
          
          // Create a downloadable URL
          const url = URL.createObjectURL(blob);
          
          // Create a mobile-friendly download approach
          toast({
            title: "Downloading Report",
            description: "Preparing your Drama Llama analysis report...",
            duration: 2000,
          });
          
          // First try direct download with link click
          const downloadLink = document.createElement('a');
          downloadLink.href = url;
          downloadLink.download = `drama-llama-analysis-${new Date().toISOString().split('T')[0]}.html`;
          downloadLink.style.display = 'none';
          document.body.appendChild(downloadLink);
          
          // This triggers the download in most browsers including mobile
          downloadLink.click();
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
          }, 100);
          
          // Show additional instructions for mobile users
          const mobileInstructions = document.createElement('div');
          mobileInstructions.className = 'fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[60] p-4';
          
          mobileInstructions.innerHTML = `
            <div class="bg-white rounded-lg w-full max-w-md p-5 flex flex-col">
              <h3 class="text-lg font-bold mb-2 text-center">Download Instructions</h3>
              <p class="text-sm mb-4 text-center">For mobile devices:</p>
              <ol class="text-sm mb-4 ml-5 list-decimal">
                <li class="mb-2">If a download prompt appears, tap "Download"</li>
                <li class="mb-2">If the report opens in a new tab, tap and hold on the page and select "Save" or "Download"</li>
                <li class="mb-2">On some devices, you may need to tap the "..." menu and select "Download"</li>
              </ol>
              <div class="text-sm mb-4 p-3 bg-blue-50 rounded">
                <p class="font-bold">Trouble downloading?</p>
                <p>You can also view the report in the preview window and take screenshots</p>
              </div>
              <button id="close-mobile-instructions" class="px-4 py-2 bg-primary text-white rounded self-center">
                Got it
              </button>
            </div>
          `;
          
          // Add to DOM after a short delay to ensure the download starts first
          setTimeout(() => {
            document.body.appendChild(mobileInstructions);
            
            // Add close handler
            document.getElementById('close-mobile-instructions')?.addEventListener('click', () => {
              document.body.removeChild(mobileInstructions);
            });
          }, 1000);
          
        } catch (err) {
          console.error("Download failed:", err);
          toast({
            title: "Download Failed",
            description: "Please try viewing the document in a browser and saving it manually",
            variant: "destructive",
          });
        }
      });
      
      // Add close handler
      document.getElementById('close-document-preview')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        document.body.style.overflow = ''; // Restore scrolling
      });
      
      // Remove the temporary container
      document.body.removeChild(tempContainer);
      
    } catch (error) {
      console.error("Document export failed:", error);
      toast({
        title: "Export Failed",
        description: "Please try taking screenshots instead.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Extremely simplified screenshot feature for mobile compatibility
  const exportAsImage = async () => {
    if (!resultsRef.current || !result) {
      toast({
        title: "Screenshot Failed",
        description: "Could not create image. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      
      toast({
        title: "Creating Image",
        description: "Please wait...",
        duration: 3000,
      });
      
      try {
        // Generate image with minimal settings for better mobile compatibility
        const element = resultsRef.current;
        const dataUrl = await toJpeg(element, { 
          cacheBust: true,
          quality: 0.8,
          backgroundColor: 'white',
          canvasWidth: 1000,
          pixelRatio: 1
        });
        
        // Skip trying to download directly, just show the image for saving
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/95 flex flex-col z-50';
        
        modal.innerHTML = `
          <div class="p-3 flex justify-between items-center bg-gray-900 text-white">
            <h3 class="text-sm font-bold">Long-press on image to save</h3>
            <button id="close-fullscreen-image" class="px-3 py-1 bg-gray-700 text-sm rounded">
              Close
            </button>
          </div>
          <div class="flex-1 overflow-auto flex items-center justify-center">
            <img src="${dataUrl}" alt="Analysis Result" class="max-w-full" />
          </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
        
        // Add close handler
        document.getElementById('close-fullscreen-image')?.addEventListener('click', () => {
          document.body.removeChild(modal);
          document.body.style.overflow = ''; // Restore scrolling
        });
        
        toast({
          title: "Screenshot Ready",
          description: "Long-press on the image to save it to your phone",
          duration: 5000,
        });
        
      } catch (error) {
        console.error("Screenshot generation failed:", error);
        toast({
          title: "Screenshot Failed",
          description: "Please try taking a manual screenshot instead.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Image export error:", error);
      toast({
        title: "Screenshot Failed",
        description: "Please try taking a manual screenshot instead.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setFileName(file.name);
      
      // First check if it's a text file
      if (file.type === "text/plain" || file.name.endsWith('.txt')) {
        setFileIsZip(false);
        const text = await file.text();
        setConversation(text);
        toast({
          title: "Text File Imported",
          description: `Successfully imported ${file.name}`,
        });
        return;
      }
      
      // Otherwise treat as ZIP
      setFileIsZip(true);
      const base64 = await fileToBase64(file);
      const response = await fetch('/api/extract-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: base64 }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract chat from ZIP');
      }
      
      const data = await response.json();
      setConversation(data.text);
      
      toast({
        title: "ZIP File Imported",
        description: `Successfully extracted WhatsApp chat from ${file.name}`,
      });
    } catch (err: any) {
      console.error("File upload error:", err);
      toast({
        title: "Import Failed",
        description: err.message || "Could not process file",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = () => {
    if (!conversation.trim()) {
      setErrorMessage("Please enter a conversation to analyze");
      return;
    }
    
    if (!me.trim() || !them.trim()) {
      if (conversation.trim()) {
        detectNamesMutation.mutate(conversation);
      } else {
        setErrorMessage("Please enter names of both participants");
      }
      return;
    }
    
    // Create request with date filtering if enabled
    const request = { 
      conversation, 
      me, 
      them, 
      tier,
      // Include date filtering options if enabled
      dateFilter: enableDateFilter ? {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined
      } : undefined
    };
    
    analysisMutation.mutate(request);
  };

  const handleDetectNames = () => {
    if (!conversation.trim()) {
      setErrorMessage("Please enter a conversation first");
      return;
    }
    
    detectNamesMutation.mutate(conversation);
  };
  
  // Function to switch the detected names if they're incorrect
  const handleSwitchRoles = () => {
    const tempMe = me;
    setMe(them);
    setThem(tempMe);
    
    toast({
      title: "Names Switched",
      description: `Switched names: You are now ${them}, they are ${tempMe}`,
    });
  };

  return (
    <section className="container py-10">
      <div className="mb-4">
        <BackHomeButton />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Chat Analysis</h2>
            <p className="text-muted-foreground">
              Upload or paste a conversation to analyze the emotional dynamics and communication patterns.
            </p>
            
            {/* Usage Meter */}
            <div className="mt-4 bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Analysis Usage</span>
                <span className="text-sm">{usedAnalyses} of {limit} used</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full mb-1 overflow-hidden">
                <div 
                  style={{width: `${Math.min(100, (usedAnalyses / limit) * 100)}%`}}
                  className={`h-full ${usedAnalyses >= limit ? 'bg-red-500' : 'bg-primary'}`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {canUseFeature 
                  ? `You have ${limit - usedAnalyses} analysis${limit - usedAnalyses === 1 ? '' : 'es'} remaining${tier === 'free' ? ' on your free plan' : ''}.` 
                  : "You've reached your limit. Upgrade for more analyses."}
              </p>
            </div>
          </div>
          
          {!showResults ? (
            <>
              {/* Error Message Display */}
              {errorMessage && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}
              
              <Tabs value={tabValue} onValueChange={setTabValue} className="mb-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="paste">Paste Text</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                </TabsList>
                <TabsContent value="paste" className="mt-4">
                  <Textarea 
                    placeholder="Paste your WhatsApp or other chat here..."
                    value={conversation}
                    onChange={(e) => setConversation(e.target.value)}
                    className="min-h-[200px]"
                  />
                </TabsContent>
                <TabsContent value="upload" className="mt-4">
                  <div className="grid grid-cols-1 gap-6">
                    {/* WhatsApp Export UI with blue styling */}
                    <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
                      <p className="text-xs text-blue-800 font-medium">✨ New Feature:</p>
                      <p className="text-xs text-blue-700">You can now directly upload WhatsApp chat export files (.txt) without needing to use ZIP files!</p>
                    </div>
                    <div className="border border-blue-200 border-dashed rounded-lg p-6 text-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream,text/plain,.txt"
                        className="hidden"
                      />
                      
                      <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Archive className="h-8 w-8 text-blue-500" />
                      </div>
                      
                      <h3 className="text-xl font-medium text-blue-800 mb-2">WhatsApp Chat Exports</h3>
                      <p className="text-sm text-blue-600 mb-6 max-w-md mx-auto">
                        Upload a WhatsApp chat export (.txt file or .zip archive). On WhatsApp, tap ⋮ on a chat, "More" → "Export chat" → "Without media"
                      </p>
                      
                      <Button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        Choose File
                      </Button>
                      
                      {fileName && (
                        <div className="mt-4 bg-blue-50 p-3 rounded">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-blue-500 mr-2" />
                            <span className="text-sm text-blue-800">{fileName}</span>
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            {fileIsZip 
                              ? "ZIP file detected: we will extract the chat automatically."
                              : "Text file detected: directly using the file content."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Your Name</label>
                  <div className="flex space-x-2">
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Your name in the chat"
                      value={me}
                      onChange={(e) => setMe(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Other Person's Name</label>
                  <div className="flex space-x-2">
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Other person's name"
                      value={them}
                      onChange={(e) => setThem(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 mb-4">
                <Button
                  variant="outline"
                  onClick={handleDetectNames}
                  disabled={!conversation.trim() || detectNamesMutation.isPending}
                >
                  {detectNamesMutation.isPending ? "Detecting..." : "Auto-Detect Names"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleSwitchRoles}
                  disabled={!me || !them}
                >
                  Switch Names
                </Button>
              </div>
              
              {/* Date Filtering Section */}
              <div className="mb-6 border border-blue-100 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="date-filter"
                      checked={enableDateFilter}
                      onCheckedChange={setEnableDateFilter}
                    />
                    <Label htmlFor="date-filter" className="text-blue-800 font-medium">
                      Focus on Recent Messages
                    </Label>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs text-blue-700 bg-blue-100 py-1 px-2 rounded-full">✨ New</span>
                  </div>
                </div>
                
                {enableDateFilter && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="from-date" className="block text-sm mb-2 text-blue-800">
                        From Date (Include messages after this date)
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="from-date"
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!startDate ? "text-muted-foreground" : ""}`}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : "Select start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {startDate && (
                        <Button 
                          variant="ghost" 
                          onClick={() => setStartDate(undefined)}
                          className="mt-1 h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Clear date
                        </Button>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="to-date" className="block text-sm mb-2 text-blue-800">
                        To Date (Optional - limit to messages before this date)
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="to-date"
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!endDate ? "text-muted-foreground" : ""}`}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : "Select end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            disabled={(date) => startDate ? date < startDate : false}
                          />
                        </PopoverContent>
                      </Popover>
                      {endDate && (
                        <Button 
                          variant="ghost" 
                          onClick={() => setEndDate(undefined)}
                          className="mt-1 h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Clear date
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {enableDateFilter && (
                  <div className="mt-3 text-sm text-blue-800">
                    <p>The AI will focus on analyzing messages {startDate ? `from ${format(startDate, "PPP")}` : ""} 
                    {endDate ? ` through ${format(endDate, "PPP")}` : startDate ? " to the present" : ""}.
                    This helps focus on recent and relevant conversations, especially in long chat histories.</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleAnalyze}
                  disabled={!canUseFeature || !conversation.trim() || analysisMutation.isPending}
                >
                  {analysisMutation.isPending ? "Analyzing..." : "Analyze Chat"}
                </Button>
              </div>
              
              {!canUseFeature && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {tier === 'free' 
                      ? "You have reached your free tier limit of 1 chat analysis per month. Upgrade for more analyses."
                      : tier === 'personal'
                      ? "You have reached your personal plan limit of 10 chat analyses per month. Upgrade for unlimited analyses."
                      : "You have reached your plan limit. Please contact support if you need more analyses."}
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div id="analysisResults" ref={resultsRef} className="mt-8 slide-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Analysis Results</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwitchRoles}
                  disabled={!me || !them}
                >
                  Switch Names
                </Button>
              </div>
              
              {result && (
                <>
                  {/* Show different UI based on tier */}
                  {tier === 'free' ? (
                    <FreeTierAnalysis result={result} me={me} them={them} />
                  ) : (
                    <>
                      {/* Psychological Profile for Pro and Instant Deep Dive tiers */}
                      {(tier === 'pro' || tier === 'instant') && result.psychologicalProfile && (
                        <PsychologicalProfile result={result} me={me} them={them} />
                      )}
                      
                      <div className="bg-muted p-4 rounded-lg mb-4">
                        <h4 className="font-medium mb-2">Overall Tone</h4>
                        <div className="mb-4">
                      <p className="text-lg font-medium mb-1">{result.toneAnalysis.overallTone.split('.')[0]}</p>
                      <p className="text-base text-gray-700">
                        {result.toneAnalysis.overallTone.includes('.') ? 
                          result.toneAnalysis.overallTone.substring(result.toneAnalysis.overallTone.indexOf('.')+1).trim() : 
                          "This analysis provides insights into the communication dynamics between participants."}
                      </p>
                    </div>
                    
                    {result.toneAnalysis.participantTones && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="font-medium mb-2 text-sm uppercase tracking-wide text-muted-foreground">Participant Analysis</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(34, 201, 201, 0.1)', border: '1px solid rgba(34, 201, 201, 0.3)' }}>
                            <span style={{ color: '#22C9C9' }} className="font-medium">{me}</span>
                            <p style={{ color: 'rgba(34, 201, 201, 0.9)' }} className="mt-1">{result.toneAnalysis.participantTones[me]}</p>
                          </div>
                          <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(255, 105, 180, 0.1)', border: '1px solid rgba(255, 105, 180, 0.3)' }}>
                            <span style={{ color: '#FF69B4' }} className="font-medium">{them}</span>
                            <p style={{ color: 'rgba(255, 105, 180, 0.9)' }} className="mt-1">{result.toneAnalysis.participantTones[them]}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Health Score Display - using our new component */}
                  <HealthScoreDisplay 
                    healthScore={result.healthScore}
                    me={me}
                    them={them}
                    tier={tier}
                  />
                  
                  {/* Tension Contributions Section - only show if present */}
                  {/* Tension Contributions section is now rendered by the TensionContributions component below */}
                  
                  {/* Communication Insights Section */}
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <h4 className="font-medium mb-2">Communication Insights</h4>
                    {(result.communication && result.communication.patterns && result.communication.patterns.length > 0) ? (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-muted-foreground mb-1">Communication Patterns</h5>
                        <div className="space-y-3">
                          {/* Show patterns with highlighted participant names */}
                          {Array.from(new Set(result.communication.patterns)).map((pattern, idx) => {
                            // Highlight participant names in the pattern text
                            let highlightedPattern = pattern;
                            
                            // Check if pattern contains participant names
                            if (pattern.includes(me)) {
                              highlightedPattern = pattern.replace(
                                new RegExp(me, 'g'), 
                                `<span class="font-semibold text-[#22C9C9]">${me}</span>`
                              );
                            }
                            
                            if (pattern.includes(them)) {
                              highlightedPattern = highlightedPattern.replace(
                                new RegExp(them, 'g'), 
                                `<span class="font-semibold text-[#FF69B4]">${them}</span>`
                              );
                            }
                            
                            return (
                              <div key={idx} className="p-3 rounded bg-white border border-gray-200 shadow-sm">
                                <p><span className="text-gray-700" dangerouslySetInnerHTML={{ __html: highlightedPattern }}></span></p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-muted-foreground mb-1">Communication Patterns</h5>
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-blue-600">
                            {result.healthScore && result.healthScore.score > 85 ? 
                              <>Both <span className="font-semibold text-[#22C9C9]">{me}</span> and <span className="font-semibold text-[#FF69B4]">{them}</span> engage in supportive dialogue with positive emotional tone.</> :
                              result.healthScore && result.healthScore.score < 60 ? 
                              <>Some tension detected between <span className="font-semibold text-[#22C9C9]">{me}</span> and <span className="font-semibold text-[#FF69B4]">{them}</span> with moments of accusatory language.</> : 
                              <>Mixed communication patterns between <span className="font-semibold text-[#22C9C9]">{me}</span> and <span className="font-semibold text-[#FF69B4]">{them}</span> with a generally neutral emotional tone.</>}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {result.communication.suggestions && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-1">Personalized Suggestions</h5>
                        <div className="space-y-3 mt-2">
                          {result.communication.suggestions.map((suggestion, idx) => {
                            // Determine if suggestion is specifically for one participant
                            const forMe = suggestion.toLowerCase().includes(me.toLowerCase());
                            const forThem = suggestion.toLowerCase().includes(them.toLowerCase());
                            
                            return (
                              <div 
                                key={idx} 
                                className="p-3 rounded border"
                                style={{
                                  backgroundColor: forMe 
                                    ? 'rgba(34, 201, 201, 0.1)'
                                    : forThem 
                                      ? 'rgba(255, 105, 180, 0.1)'
                                      : 'rgba(147, 51, 234, 0.1)',
                                  borderColor: forMe 
                                    ? 'rgba(34, 201, 201, 0.3)'
                                    : forThem 
                                      ? 'rgba(255, 105, 180, 0.3)'
                                      : 'rgba(147, 51, 234, 0.3)'
                                }}
                              >
                                <div className="flex items-start">
                                  <div className="mt-1 mr-2" style={{
                                    color: forMe 
                                      ? '#22C9C9'
                                      : forThem 
                                        ? '#FF69B4'
                                        : '#9333EA'
                                  }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                    </svg>
                                  </div>
                                  <div>
                                    {forMe && (
                                      <div className="text-xs font-medium mb-1" style={{ color: '#22C9C9' }}>For {me}</div>
                                    )}
                                    {forThem && (
                                      <div className="text-xs font-medium mb-1" style={{ color: '#FF69B4' }}>For {them}</div>
                                    )}
                                    {!forMe && !forThem && (
                                      <div className="text-xs font-medium mb-1" style={{ color: '#9333EA' }}>For both participants</div>
                                    )}
                                    <p className="text-sm" style={{
                                      color: forMe 
                                        ? 'rgba(34, 201, 201, 0.9)'
                                        : forThem 
                                          ? 'rgba(255, 105, 180, 0.9)'
                                          : 'rgba(147, 51, 234, 0.9)'
                                    }}>
                                      {suggestion}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Key Quotes Section - Pro Tier Only */}
                  {result.keyQuotes && result.keyQuotes.length > 0 && (tier === 'pro' || tier === 'instant') && (
                    <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
                      <h4 className="font-medium mb-2 text-blue-700">Key Quotes Analysis</h4>
                      <div className="space-y-3">
                        {result.keyQuotes.map((quote, idx) => {
                          // Determine which participant's quote
                          const isMeQuote = quote.speaker === me;
                          const isThemQuote = quote.speaker === them;
                          
                          // Set color based on speaker
                          const speakerColor = isMeQuote 
                            ? '#22C9C9' 
                            : isThemQuote 
                              ? '#FF69B4' 
                              : '#3B82F6';
                          
                          // Set background color based on speaker
                          const bgColor = isMeQuote 
                            ? 'rgba(34, 201, 201, 0.1)' 
                            : isThemQuote 
                              ? 'rgba(255, 105, 180, 0.1)' 
                              : 'rgba(59, 130, 246, 0.1)';
                          
                          // Set border color based on speaker
                          const borderColor = isMeQuote 
                            ? 'rgba(34, 201, 201, 0.3)' 
                            : isThemQuote 
                              ? 'rgba(255, 105, 180, 0.3)' 
                              : 'rgba(59, 130, 246, 0.3)';
                              
                          return (
                            <div 
                              key={idx} 
                              className="bg-white p-3 rounded border" 
                              style={{ borderColor }}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span 
                                  className="font-semibold" 
                                  style={{ color: speakerColor }}
                                >
                                  {quote.speaker}
                                </span>
                                <span 
                                  className="text-xs px-2 py-1 rounded"
                                  style={{ backgroundColor: bgColor, color: speakerColor }}
                                >
                                  Quote #{idx + 1}
                                </span>
                              </div>
                              <p 
                                className="italic mb-2"
                                style={{ color: 'rgba(75, 85, 99, 0.9)' }}
                              >
                                "{quote.quote}"
                              </p>
                              <div className="space-y-2">
                                <p 
                                  className="text-sm p-2 rounded"
                                  style={{ backgroundColor: bgColor, color: 'rgba(75, 85, 99, 0.9)' }}
                                >
                                  <span 
                                    className="font-medium"
                                    style={{ color: speakerColor }}
                                  >
                                    Analysis:
                                  </span> {quote.analysis}
                                </p>
                                {quote.improvement && (
                                  <div 
                                    className="text-sm p-2 rounded border"
                                    style={{ 
                                      backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                                      borderColor: 'rgba(34, 197, 94, 0.3)',
                                      color: 'rgba(75, 85, 99, 0.9)'
                                    }}
                                  >
                                    <span 
                                      className="font-medium"
                                      style={{ color: 'rgba(34, 197, 94, 0.9)' }}
                                    >
                                      Possible Reframe:
                                    </span> {quote.improvement}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Removed duplicate Health Score Display */}
                  
                  {/* Emotion Tracking Per Participant (Personal+ Tier) */}
                  <EmotionTracking
                    me={me}
                    them={them}
                    tier={tier}
                    emotionalState={result.toneAnalysis.emotionalState}
                    participantTones={result.toneAnalysis.participantTones}
                  />
                  
                  {/* Red Flags Detection (Personal+ Tier) */}
                  <RedFlags 
                    redFlags={result.redFlags} 
                    tier={tier}
                    conversation={conversation} 
                  />
                  
                  {/* Communication Styles Breakdown (Personal+ Tier) */}
                  <CommunicationStyles 
                    me={me} 
                    them={them} 
                    participantConflictScores={result.participantConflictScores}
                    overallTone={result.toneAnalysis?.overallTone} 
                  />
                  
                  {/* Tension Contributions (Personal+ Tier) */}
                  <TensionContributions
                    me={me}
                    them={them}
                    tier={tier}
                    tensionContributions={result.tensionContributions}
                  />
                  
                  {/* Personalized Suggestions (Pro Tier Only) */}
                  {(tier === 'pro' || tier === 'instant') && (
                    <PersonalizedSuggestions
                      me={me}
                      them={them}
                      tier={tier}
                      suggestions={result.communication?.suggestions}
                    />
                  )}
                  
                  {/* Self-Reflection Section removed as requested */}
                  
                  {/* Behavioral Patterns Detection (Pro+ Tier) */}
                  <BehavioralPatterns 
                    tier={tier} 
                    conversation={conversation}
                    dynamics={result.communication?.dynamics}
                    me={me}
                    them={them}
                  />
                  
                  {/* Pro-tier Advanced Features */}
                  <AdvancedTrendLines 
                    tier={tier} 
                    conversation={conversation} 
                  />
                  
                  <EvasionPowerDynamics 
                    tier={tier} 
                    me={me} 
                    them={them} 
                    conversation={conversation}
                  />
                  
                  <EmotionalShiftsTimeline
                    tier={tier}
                    me={me}
                    them={them}
                    conversation={conversation}
                    emotionalState={result.toneAnalysis.emotionalState}
                  />
                  
                  <div className="mt-6 flex justify-end">
                    <Button
                      variant="outline"
                      className="mr-2"
                      onClick={() => setShowResults(false)}
                    >
                      Back to Analysis
                    </Button>
                    <Button
                      onClick={exportToPdf}
                      disabled={isExporting}
                      className="mr-2"
                    >
                      {isExporting ? 'Creating...' : 'Create Formal Report'}
                    </Button>
                    <Button 
                      variant="secondary"
                      onClick={exportAsImage}
                      disabled={isExporting}
                    >
                      {isExporting ? 'Creating...' : 'View as Image'}
                    </Button>
                  </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}