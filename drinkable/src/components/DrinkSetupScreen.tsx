import { useEffect, useMemo, useState } from 'react'
import {
  baseDrinkOptions,
  beerVolumeOptions,
  cocktailVolumePresets,
  defaultCocktailVolumeMl,
  distilledDefaultVolumes,
  distilledOptions,
  drinkTypes,
} from '../data/drinks'
import type {
  BaseDrinkCategory,
  DistilledSubType,
  DrinkSelection,
} from '../types'

interface DrinkSetupScreenProps {
  onComplete(selection: DrinkSelection): void
  onBack(): void
  onPhotoRequest?(): void
}

const ML_PER_FL_OZ = 29.57

const getDrinkType = (
  base: BaseDrinkCategory | null,
  distilled: DistilledSubType | null,
) => {
  if (!base) return undefined
  if (base === 'distilled') {
    if (!distilled) return undefined
    return drinkTypes.find(
      (drink) =>
        drink.baseCategory === 'distilled' && drink.distilledSubType === distilled,
    )
  }
  return drinkTypes.find((drink) => drink.baseCategory === base)
}

const formatVolume = (ml?: number) =>
  ml ? `${Math.round(ml)} ml per serving` : 'Volume pending'

export const DrinkSetupScreen = ({
  onComplete,
  onBack,
  onPhotoRequest,
}: DrinkSetupScreenProps) => {
  const [selectedBase, setSelectedBase] = useState<BaseDrinkCategory | null>(null)
  const [selectedDistilled, setSelectedDistilled] =
    useState<DistilledSubType | null>(null)
  const [customAbv, setCustomAbv] = useState('')
  const [customName, setCustomName] = useState('')
  const [cocktailVolume, setCocktailVolume] = useState('')
  const [cocktailVolumeEdited, setCocktailVolumeEdited] = useState(false)
  const [beerVolume, setBeerVolume] = useState(beerVolumeOptions[0].value)
  const [distilledVolumeInput, setDistilledVolumeInput] = useState('')
  const [distilledUnit, setDistilledUnit] = useState<'ml' | 'fl-oz'>('ml')

  const drinkType = useMemo(
    () => getDrinkType(selectedBase, selectedDistilled),
    [selectedBase, selectedDistilled],
  )

  useEffect(() => {
    if (!selectedBase || selectedBase !== 'cocktail') {
      setCustomName('')
      setCocktailVolume('')
      setCocktailVolumeEdited(false)
    }
  }, [selectedBase])

  useEffect(() => {
    if (selectedBase === 'distilled' && selectedDistilled) {
      const preset = distilledDefaultVolumes[selectedDistilled]
      setDistilledUnit('ml')
      setDistilledVolumeInput(preset ? preset.toString() : '')
    }
  }, [selectedBase, selectedDistilled])

  useEffect(() => {
    if (selectedBase !== 'cocktail') return
    const preset = cocktailVolumePresets[customName.trim().toLowerCase()]
    if (preset && !cocktailVolumeEdited) {
      setCocktailVolume(preset.toString())
    }
  }, [customName, cocktailVolumeEdited, selectedBase])

  useEffect(() => {
    if (selectedBase === 'cocktail' && !customName.trim()) {
      setCocktailVolumeEdited(false)
      setCocktailVolume('')
    }
  }, [customName, selectedBase])

  const parsedAbv = customAbv ? Number.parseFloat(customAbv) : undefined
  const sanitizedAbv =
    typeof parsedAbv === 'number' && Number.isFinite(parsedAbv) ? parsedAbv : undefined
  const isAbvValid =
    sanitizedAbv === undefined || (sanitizedAbv >= 1 && sanitizedAbv <= 80)

  const distilledVolumeMl = useMemo(() => {
    const numeric = Number.parseFloat(distilledVolumeInput)
    if (Number.isNaN(numeric)) return undefined
    return distilledUnit === 'ml' ? numeric : numeric * ML_PER_FL_OZ
  }, [distilledVolumeInput, distilledUnit])

  const cocktailVolumeMl = (() => {
    const parsed = Number.parseFloat(cocktailVolume)
    if (Number.isNaN(parsed)) return undefined
    return parsed
  })()

  const resolvedVolumeMl = useMemo(() => {
    if (!drinkType) return undefined
    switch (selectedBase) {
      case 'beer':
        return beerVolume
      case 'distilled':
        if (distilledVolumeMl && distilledVolumeMl > 0) return distilledVolumeMl
        if (selectedDistilled) return distilledDefaultVolumes[selectedDistilled]
        return drinkType.defaultVolumeMl
      case 'cocktail':
        return cocktailVolumeMl && cocktailVolumeMl > 0
          ? cocktailVolumeMl
          : defaultCocktailVolumeMl
      default:
        return drinkType.defaultVolumeMl
    }
  }, [beerVolume, cocktailVolumeMl, distilledVolumeMl, drinkType, selectedBase, selectedDistilled])

  const canProceed = Boolean(drinkType && isAbvValid && resolvedVolumeMl)

  const handleNext = () => {
    if (!drinkType || !selectedBase || !resolvedVolumeMl) return
    onComplete({
      drinkTypeId: drinkType.id,
      baseCategory: selectedBase,
      customAbv: sanitizedAbv,
      customName: customName.trim() ? customName.trim() : undefined,
      photoUrl: undefined,
      volumeMl: resolvedVolumeMl,
      count: 0,
      distilledSubType: selectedDistilled ?? undefined,
    })
  }

  const needsCocktailFields = selectedBase === 'cocktail'
  const needsDistilledStep = selectedBase === 'distilled'
  const needsBeerVolume = selectedBase === 'beer'

  const handleDistilledUnitChange = (unit: 'ml' | 'fl-oz') => {
    if (unit === distilledUnit) return
    const numeric = Number.parseFloat(distilledVolumeInput)
    let newValue = ''
    if (!Number.isNaN(numeric)) {
      const valueInMl = distilledUnit === 'ml' ? numeric : numeric * ML_PER_FL_OZ
      const converted = unit === 'ml' ? valueInMl : valueInMl / ML_PER_FL_OZ
      newValue = (Math.round(converted * 10) / 10).toString()
    }
    setDistilledUnit(unit)
    setDistilledVolumeInput(newValue)
  }

  return (
    <div className="min-h-screen bg-backgroundSoft px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-brand">Step 2</p>
            <h1 className="mt-2 text-3xl font-semibold text-textPrimary">
              Choose what you’re drinking
            </h1>
            <p className="text-sm text-textSecondary">
              Tap a base drink and customize the serving size or ABV if you know it.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-textSecondary underline"
          >
            Back
          </button>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-card">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-textSecondary">Base drink</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {baseDrinkOptions.map((option) => {
                const isActive = selectedBase === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSelectedBase(option.id)
                      setSelectedDistilled(null)
                      if (option.id === 'beer') {
                        setBeerVolume(beerVolumeOptions[0].value)
                      } else if (option.id !== 'distilled') {
                        setDistilledVolumeInput('')
                      }
                    }}
                    className={`flex items-center gap-3 rounded-3xl border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-brand bg-brand/5 shadow-sm'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-2xl">
                      {option.icon}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-textPrimary">
                        {option.title}
                      </p>
                      <p className="text-sm text-textSecondary">
                        {option.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {needsBeerVolume && (
            <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold text-textSecondary">
                Serving size
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {beerVolumeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBeerVolume(option.value)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      beerVolume === option.value
                        ? 'border-brand bg-brand text-white'
                        : 'border-slate-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {needsDistilledStep && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-textSecondary">
                  Distilled subtype
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {distilledOptions.map((option) => {
                    const isActive = selectedDistilled === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedDistilled(option.id)}
                        className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                          isActive
                            ? 'border-brand bg-brand text-white'
                            : 'border-slate-200 text-textPrimary'
                        }`}
                      >
                        <p>{option.label}</p>
                        <p
                          className={`text-xs font-normal ${
                            isActive ? 'text-white/80' : 'text-textSecondary'
                          }`}
                        >
                          {option.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-textSecondary">
                  Serving size
                </label>
                <div className="flex gap-2">
                  {(['ml', 'fl-oz'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => handleDistilledUnitChange(unit)}
                      className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold ${
                        distilledUnit === unit
                          ? 'border-brand bg-brand text-white'
                          : 'border-slate-200 text-textPrimary'
                      }`}
                    >
                      {unit.toUpperCase()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={5}
                  step="0.5"
                  value={distilledVolumeInput}
                  onChange={(event) => setDistilledVolumeInput(event.target.value)}
                  placeholder={distilledUnit === 'ml' ? 'e.g., 45' : 'e.g., 1.5'}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base focus:border-brand focus:outline-none"
                />
                <p className="text-xs text-textSecondary">
                  We’ll convert everything to milliliters for tracking.
                </p>
              </div>
            </div>
          )}

          {needsCocktailFields && (
            <div className="mt-6 space-y-2">
              <label className="text-sm font-semibold text-textSecondary">
                Cocktail name (optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Margarita"
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base focus:border-brand focus:outline-none"
              />
              <button
                type="button"
                onClick={onPhotoRequest}
                className="w-full rounded-2xl border border-dashed border-brand px-4 py-3 text-sm font-semibold text-brand"
              >
                Identify drink from photo
              </button>
              <label className="mt-4 text-sm font-semibold text-textSecondary">
                Serving size (ml)
              </label>
              <input
                type="number"
                min={30}
                value={cocktailVolume}
                placeholder="Leave blank to use the default"
                onChange={(event) => {
                  setCocktailVolume(event.target.value)
                  setCocktailVolumeEdited(true)
                }}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base focus:border-brand focus:outline-none"
              />
              <p className="text-xs text-textSecondary">
                Matching cocktails auto-fill common serving sizes. Defaults to {defaultCocktailVolumeMl} ml.
              </p>
            </div>
          )}

          {drinkType && (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-textSecondary">Current selection</p>
              <p className="text-lg font-semibold text-textPrimary">
                {customName || drinkType.name}
              </p>
              <p className="text-sm text-textSecondary">
                Default ABV {drinkType.defaultAbv}% · {formatVolume(resolvedVolumeMl ?? drinkType.defaultVolumeMl)}
              </p>
            </div>
          )}

          <div className="mt-6 space-y-2">
            <label className="text-sm font-semibold text-textSecondary">
              Alcohol by volume (ABV %)
              <span className="ml-1 text-slate-400">optional</span>
            </label>
            <input
              type="number"
              min={1}
              max={80}
              inputMode="decimal"
              value={customAbv}
              onChange={(event) => setCustomAbv(event.target.value)}
              placeholder="If you don’t know the exact ABV, we’ll use an average value."
              className={`w-full rounded-2xl border px-4 py-3 text-base focus:border-brand focus:outline-none ${
                isAbvValid ? 'border-slate-200' : 'border-danger'
              }`}
            />
            <button
              type="button"
              onClick={() => setCustomAbv('')}
              className="text-sm font-semibold text-textSecondary underline"
            >
              Use average ABV
            </button>
            {!isAbvValid && (
              <p className="text-sm text-danger">Enter a value between 1% and 80%.</p>
            )}
          </div>

          <button
            type="button"
            className={`mt-8 w-full rounded-full px-4 py-4 text-base font-semibold text-white transition ${
              canProceed
                ? 'bg-brand shadow-card hover:bg-brandMedium'
                : 'bg-slate-200 text-slate-400'
            }`}
            disabled={!canProceed}
            onClick={handleNext}
          >
            Start session
          </button>
        </section>
      </div>
    </div>
  )
}

export default DrinkSetupScreen
