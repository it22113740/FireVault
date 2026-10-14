"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { ImagePicker } from "@/components/image-picker";
import { SubmitButton } from "@/components/submit-button";
import { Turnstile, turnstileEnabled } from "@/components/turnstile";
import { Input } from "@/components/ui/input";
import { submitApplication } from "@/lib/actions/applications";
import { showActionError } from "@/lib/forms";
import { applicationSchema, type ApplicationInput } from "@/lib/validations/application";

export function ApplyForm() {
  const [pending, startTransition] = useTransition();
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotError, setScreenshotError] = useState<string>();
  const [token, setToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const form = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", email: "", whatsappNumber: "", contactNumber: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    if (!screenshot) return setScreenshotError("Upload a screenshot of the WhatsApp group.");

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, value));
    formData.set("screenshot", screenshot);
    if (token) formData.set("cf-turnstile-response", token);

    startTransition(async () => {
      // Redirects to /apply/success; only failures come back
      const result = await submitApplication(formData);
      if (result && !result.ok) {
        showActionError(result, form.setError);
        setScreenshotError(result.fieldErrors?.screenshot?.[0]);
        // Turnstile tokens are single-use
        setToken(null);
        setTurnstileKey((key) => key + 1);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormField label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input
          id="fullName"
          autoComplete="name"
          className="h-11"
          aria-invalid={!!errors.fullName}
          {...form.register("fullName")}
        />
      </FormField>
      <FormField
        label="Email"
        htmlFor="email"
        hint="We'll send your login link here if you're approved."
        error={errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          className="h-11"
          aria-invalid={!!errors.email}
          {...form.register("email")}
        />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="WhatsApp number"
          htmlFor="whatsappNumber"
          hint="Buyers will message you here."
          error={errors.whatsappNumber?.message}
        >
          <Input
            id="whatsappNumber"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="077 123 4567"
            className="h-11"
            aria-invalid={!!errors.whatsappNumber}
            {...form.register("whatsappNumber")}
          />
        </FormField>
        <FormField
          label="Contact number"
          htmlFor="contactNumber"
          error={errors.contactNumber?.message}
        >
          <Input
            id="contactNumber"
            type="tel"
            inputMode="tel"
            placeholder="077 123 4567"
            className="h-11"
            aria-invalid={!!errors.contactNumber}
            {...form.register("contactNumber")}
          />
        </FormField>
      </div>
      <FormField label="WhatsApp group screenshot" htmlFor="screenshot">
        <ImagePicker
          id="screenshot"
          file={screenshot}
          onFileChange={(file) => {
            setScreenshot(file);
            setScreenshotError(undefined);
          }}
          error={screenshotError}
          aspect="auto"
          label="Upload screenshot"
        />
      </FormField>
      <Turnstile key={turnstileKey} onToken={setToken} />
      <SubmitButton
        size="lg"
        className="h-11 bg-brand font-semibold text-primary-foreground"
        pending={pending}
        pendingLabel="Submitting…"
        disabled={turnstileEnabled && !token}
      >
        Submit application
      </SubmitButton>
    </form>
  );
}
