import { useMemo, useState } from 'react'
import type { Gender, UserProfile } from '../types'

interface OnboardingScreenProps {
  onComplete(profile: UserProfile): void
}

const genderOptions: { id: Gender; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
]

const numberFormatter = new Intl.NumberFormat('en-US')

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const [gender, setGender] = useState<Gender | null>(null)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')

  const weightValue = parseInt(weight, 10)
  const heightValue = parseInt(height, 10)

  const isValid =
    gender !== null &&
    !Number.isNaN(weightValue) &&
    !Number.isNaN(heightValue) &&
    weightValue >= 30 &&
    weightValue <= 200 &&
    heightValue >= 130 &&
    heightValue <= 210

  const statusText = useMemo(() => {
    if (!gender) return 'Select your gender to continue.'
    if (Number.isNaN(weightValue)) return 'Enter your weight in kilograms.'
    if (Number.isNaN(heightValue)) return 'Enter your height in centimeters.'
    if (weightValue < 30 || weightValue > 200)
      return 'Weight must be between 30 kg and 200 kg.'
    if (heightValue < 130 || heightValue > 210)
      return 'Height must be between 130 cm and 210 cm.'
    return 'All set! You can continue to the next step.'
  }, [gender, weightValue, heightValue])

  const handleNext = () => {
    if (!isValid || gender === null) return
    onComplete({
      gender,
      weightKg: clamp(weightValue, 30, 200),
      heightCm: clamp(heightValue, 130, 210),
    })
  }

  return (
    <div className="min-h-screen bg-backgroundSoft px-4 py-12">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <header className="space-y-3 text-center">
          <p className="text-4xl font-bold tracking-tight text-textPrimary">Drinkable</p>
          <h1 className="text-3xl font-semibold text-textPrimary">Welcome to Drinkable</h1>
          <p className="text-base text-textSecondary">Let’s personalize your drinking profile.</p>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-card">
          <div className="mb-6">
            <p className="text-sm font-medium text-textSecondary">Step 1</p>
            <h2 className="text-2xl font-semibold text-textPrimary">Tell us about yourself</h2>
          </div>

          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-textSecondary">Gender</p>
              <div className="grid grid-cols-3 gap-2">
                {genderOptions.map((option) => {
                  const isActive = gender === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setGender(option.id)}
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                        isActive
                          ? 'border-brand bg-brand text-white shadow-sm'
                          : 'border-slate-200 bg-white text-textPrimary'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-4 md:flex-row">
              <label className="flex flex-1 flex-col gap-2">
                <span className="text-sm font-medium text-textSecondary">Weight (kg)</span>
                <div className="flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold text-textPrimary focus-within:border-brand focus-within:bg-white">
                  <input
                    type="number"
                    min={30}
                    max={200}
                    inputMode="numeric"
                    value={weight}
                    className="w-full border-none bg-transparent outline-none"
                    onChange={(event) => setWeight(event.target.value)}
                  />
                  <span className="text-sm text-textSecondary">kg</span>
                </div>
                {!Number.isNaN(weightValue) && (
                  <span className="text-xs text-textSecondary">
                    {numberFormatter.format(weightValue)} kg
                  </span>
                )}
              </label>

              <label className="flex flex-1 flex-col gap-2">
                <span className="text-sm font-medium text-textSecondary">Height (cm)</span>
                <div className="flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold text-textPrimary focus-within:border-brand focus-within:bg-white">
                  <input
                    type="number"
                    min={130}
                    max={210}
                    inputMode="numeric"
                    value={height}
                    className="w-full border-none bg-transparent outline-none"
                    onChange={(event) => setHeight(event.target.value)}
                  />
                  <span className="text-sm text-textSecondary">cm</span>
                </div>
                {!Number.isNaN(heightValue) && (
                  <span className="text-xs text-textSecondary">
                    {numberFormatter.format(heightValue)} cm
                  </span>
                )}
              </label>
            </div>
          </div>

          <p className="mt-6 text-sm font-medium text-textSecondary">{statusText}</p>

          <button
            type="button"
            disabled={!isValid}
            onClick={handleNext}
            className={`mt-4 flex w-full items-center justify-center rounded-full px-4 py-4 text-base font-semibold text-white transition ${
              isValid
                ? 'bg-brand shadow-card hover:bg-brandMedium'
                : 'bg-slate-200 text-slate-400'
            }`}
          >
            Continue
          </button>
        </section>
      </div>
    </div>
  )
}

export default OnboardingScreen
