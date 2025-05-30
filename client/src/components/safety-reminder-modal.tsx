import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Shield, X } from 'lucide-react';

interface SafetyReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
}

export function SafetyReminderModal({ isOpen, onClose, onDontShowAgain }: SafetyReminderModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      onDontShowAgain();
    }
    onClose();
  };

  const handleLearnMore = () => {
    // Open external resource in new tab
    window.open('https://www.thehotline.org/help/help-for-friends-and-family/', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            ⚠️ Important Reminder
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 space-y-2">
            <p>
              If you're in a controlling or unsafe relationship, don't forget to delete any screenshots after uploading.
            </p>
            <p className="font-medium text-yellow-700">
              Your privacy matters. Stay safe. 💛
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label
              htmlFor="dontShowAgain"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Don't show this reminder again
            </label>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleLearnMore}
            className="w-full sm:w-auto"
          >
            <Shield className="h-4 w-4 mr-2" />
            Learn how to stay safe
          </Button>
          <Button onClick={handleClose} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}