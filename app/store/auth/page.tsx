import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OtpForm } from '@/components/auth/otp-form'
import { GoogleButton } from '@/components/auth/google-button'

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Log in or Sign up</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your mobile number — we&apos;ll text you a one-time code to continue.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <OtpForm />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <GoogleButton />
        </CardContent>
      </Card>
    </div>
  )
}
