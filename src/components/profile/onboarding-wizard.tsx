"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/profile/form-fields";
import { HoroscopeForm } from "@/components/profile/horoscope-form";
import { OnboardingStepForm } from "@/components/profile/onboarding-step-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DIET_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  EXTENDED_RELATIONSHIP_OPTIONS,
  FAMILY_STATUS_OPTIONS,
  FAMILY_TYPE_OPTIONS,
  FAMILY_VALUES_OPTIONS,
  GENDER_OPTIONS,
  HABIT_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  ONBOARDING_STEPS,
  PROFILE_FOR_OPTIONS,
  type OnboardingStepId,
} from "@/lib/constants/profile";
import {
  MANGLIK_OPTIONS,
  RASHI_OPTIONS,
} from "@/lib/constants/horoscope";
import {
  addFamilyMemberAction,
  deleteFamilyMemberAction,
  finishOnboardingAction,
  saveBasicProfileAction,
  saveCareerAction,
  saveEducationAction,
  saveFamilyAction,
  saveLifestyleAction,
  saveLocationPhysicalAction,
  savePreferencesAction,
  saveReligionAction,
} from "@/lib/profile/actions";
import type { ProfileBundle } from "@/lib/types/profile";
import { cn } from "@/lib/utils";

type OnboardingWizardProps = {
  bundle: ProfileBundle;
  initialStep?: OnboardingStepId;
};

function str(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function OnboardingWizard({
  bundle,
  initialStep = "basic",
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStepId>(initialStep);
  const [completion, setCompletion] = useState(bundle.completion.total);
  const [sections, setSections] = useState(bundle.completion.sections);
  const [familyMembers, setFamilyMembers] = useState(bundle.familyMembers);
  const [pendingFinish, startFinish] = useTransition();

  useEffect(() => {
    setFamilyMembers(bundle.familyMembers);
    setCompletion(bundle.completion.total);
    setSections(bundle.completion.sections);
  }, [bundle]);

  const stepIndex = ONBOARDING_STEPS.findIndex((item) => item.id === step);

  const goNext = useCallback(() => {
    const next = ONBOARDING_STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  }, [stepIndex]);

  const goPrev = useCallback(() => {
    const prev = ONBOARDING_STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  }, [stepIndex]);

  const onSaved = useCallback(
    (value?: number) => {
      if (typeof value === "number") {
        setCompletion(value);
      }
      router.refresh();
      goNext();
    },
    [goNext, router],
  );

  const religionOptions = useMemo(
    () =>
      bundle.religions.map((item) => ({
        value: item.Id,
        label: item.Name,
      })),
    [bundle.religions],
  );

  const languageOptions = useMemo(
    () =>
      bundle.languages.map((item) => ({
        value: item.Id,
        label: item.Name,
      })),
    [bundle.languages],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold">
            Complete your profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Extended family, religion, and many fields are optional. Skip what
            you do not want to share.
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-2 text-sm">
          Profile completion:{" "}
          <span className="font-semibold text-primary">{completion}%</span>
        </div>
      </div>

      <ol className="flex gap-2 overflow-x-auto pb-1">
        {ONBOARDING_STEPS.map((item, index) => {
          const active = item.id === step;
          const done = index < stepIndex;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setStep(item.id)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors",
                  active && "bg-primary text-primary-foreground",
                  done && !active && "bg-primary/10 text-primary",
                  !active && !done && "bg-muted text-muted-foreground",
                )}
              >
                {index + 1}. {item.label}
              </button>
            </li>
          );
        })}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            {ONBOARDING_STEPS[stepIndex]?.label}
          </CardTitle>
          <CardDescription>
            {step === "religion" || step === "family"
              ? "Optional — you can skip and continue."
              : "Fill what you can now. You can edit later in Settings."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "basic" ? (
            <OnboardingStepForm action={saveBasicProfileAction} onSuccess={onSaved}>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  name="profileFor"
                  label="Profile created for"
                  required
                  allowEmpty={false}
                  options={PROFILE_FOR_OPTIONS}
                  defaultValue={str(bundle.profile?.ProfileFor) || "self"}
                />
                <SelectField
                  name="gender"
                  label="Gender"
                  required
                  allowEmpty={false}
                  options={GENDER_OPTIONS}
                  defaultValue={str(bundle.profile?.Gender)}
                />
                <TextField
                  name="firstName"
                  label="First name"
                  required
                  defaultValue={str(bundle.profile?.FirstName)}
                />
                <TextField
                  name="middleName"
                  label="Middle name"
                  defaultValue={str(bundle.profile?.MiddleName)}
                />
                <TextField
                  name="lastName"
                  label="Last name"
                  required
                  defaultValue={str(bundle.profile?.LastName)}
                />
                <TextField
                  name="dateOfBirth"
                  label="Date of birth"
                  type="date"
                  required
                  defaultValue={str(bundle.profile?.DateOfBirth).slice(0, 10)}
                />
                <SelectField
                  name="maritalStatus"
                  label="Marital status"
                  required
                  allowEmpty={false}
                  options={MARITAL_STATUS_OPTIONS}
                  defaultValue={
                    str(bundle.profile?.MaritalStatus) || "never_married"
                  }
                />
              </div>
              <TextAreaField
                name="aboutMe"
                label="About me"
                defaultValue={str(bundle.profile?.AboutMe)}
                placeholder="Share your values, interests, and what you are looking for."
              />
            </OnboardingStepForm>
          ) : null}

          {step === "location" ? (
            <OnboardingStepForm
              action={saveLocationPhysicalAction}
              onSuccess={onSaved}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  name="country"
                  label="Country"
                  defaultValue={str(bundle.contact?.Country) || "India"}
                />
                <TextField
                  name="state"
                  label="State"
                  defaultValue={str(bundle.contact?.State)}
                />
                <TextField
                  name="city"
                  label="City"
                  defaultValue={str(bundle.contact?.City)}
                />
                <TextField
                  name="phone"
                  label="Phone (private by default)"
                  defaultValue={str(bundle.contact?.Phone)}
                />
                <TextField
                  name="email"
                  label="Contact email (private)"
                  type="email"
                  defaultValue={str(bundle.contact?.Email)}
                />
                <TextField
                  name="heightCm"
                  label="Height (cm)"
                  type="number"
                  defaultValue={str(bundle.physical?.HeightCm)}
                />
                <TextField
                  name="weightKg"
                  label="Weight (kg)"
                  type="number"
                  defaultValue={str(bundle.physical?.WeightKg)}
                />
                <TextField
                  name="bodyType"
                  label="Body type"
                  defaultValue={str(bundle.physical?.BodyType)}
                />
                <TextField
                  name="complexion"
                  label="Complexion"
                  defaultValue={str(bundle.physical?.Complexion)}
                />
                <TextField
                  name="bloodGroup"
                  label="Blood group"
                  defaultValue={str(bundle.physical?.BloodGroup)}
                />
                <TextField
                  name="nativeCity"
                  label="Native city"
                  defaultValue={str(bundle.contact?.NativeCity)}
                />
                <TextField
                  name="nativeState"
                  label="Native state"
                  defaultValue={str(bundle.contact?.NativeState)}
                />
              </div>
              <TextAreaField
                name="address"
                label="Address (private)"
                defaultValue={str(bundle.contact?.Address)}
              />
            </OnboardingStepForm>
          ) : null}

          {step === "education" ? (
            <OnboardingStepForm action={saveEducationAction} onSuccess={onSaved}>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  name="highestEducation"
                  label="Highest education"
                  options={EDUCATION_LEVEL_OPTIONS}
                  defaultValue={str(bundle.education?.HighestEducation)}
                />
                <TextField
                  name="degree"
                  label="Degree"
                  defaultValue={str(bundle.education?.Degree)}
                />
                <TextField
                  name="specialization"
                  label="Specialization"
                  defaultValue={str(bundle.education?.Specialization)}
                />
                <TextField
                  name="institution"
                  label="Institution"
                  defaultValue={str(bundle.education?.Institution)}
                />
                <TextField
                  name="educationCity"
                  label="Education city"
                  defaultValue={str(bundle.education?.EducationCity)}
                />
                <TextField
                  name="educationCountry"
                  label="Education country"
                  defaultValue={str(bundle.education?.EducationCountry)}
                />
                <TextField
                  name="graduationYear"
                  label="Graduation year"
                  type="number"
                  defaultValue={str(bundle.education?.GraduationYear)}
                />
              </div>
              <TextAreaField
                name="additionalQualification"
                label="Additional qualification"
                defaultValue={str(bundle.education?.AdditionalQualification)}
              />
            </OnboardingStepForm>
          ) : null}

          {step === "career" ? (
            <OnboardingStepForm action={saveCareerAction} onSuccess={onSaved}>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  name="employmentType"
                  label="Employment type"
                  options={EMPLOYMENT_TYPE_OPTIONS}
                  defaultValue={str(bundle.career?.EmploymentType)}
                />
                <TextField
                  name="occupation"
                  label="Occupation"
                  defaultValue={str(bundle.career?.Occupation)}
                />
                <TextField
                  name="jobTitle"
                  label="Job title"
                  defaultValue={str(bundle.career?.JobTitle)}
                />
                <TextField
                  name="company"
                  label="Company"
                  defaultValue={str(bundle.career?.Company)}
                />
                <TextField
                  name="industry"
                  label="Industry"
                  defaultValue={str(bundle.career?.Industry)}
                />
                <TextField
                  name="workLocation"
                  label="Work location"
                  defaultValue={str(bundle.career?.WorkLocation)}
                />
                <TextField
                  name="annualIncome"
                  label="Annual income (private)"
                  type="number"
                  defaultValue={str(bundle.career?.AnnualIncome)}
                />
                <TextField
                  name="incomeCurrency"
                  label="Currency"
                  defaultValue={str(bundle.career?.IncomeCurrency) || "INR"}
                />
                <TextField
                  name="experienceYears"
                  label="Experience (years)"
                  type="number"
                  defaultValue={str(bundle.career?.ExperienceYears)}
                />
                <TextField
                  name="businessName"
                  label="Business name"
                  defaultValue={str(bundle.career?.BusinessName)}
                />
              </div>
            </OnboardingStepForm>
          ) : null}

          {step === "religion" ? (
            <div className="space-y-4">
              <OnboardingStepForm
                action={saveReligionAction}
                onSuccess={onSaved}
                submitLabel="Save religion details"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    name="religionId"
                    label="Religion"
                    options={religionOptions}
                    defaultValue={str(bundle.religion?.ReligionId)}
                  />
                  <SelectField
                    name="motherTongueId"
                    label="Mother tongue"
                    options={languageOptions}
                    defaultValue={str(bundle.religion?.MotherTongueId)}
                  />
                  <TextField
                    name="caste"
                    label="Caste (optional)"
                    defaultValue={str(bundle.religion?.Caste)}
                  />
                  <TextField
                    name="subCaste"
                    label="Sub-caste (optional)"
                    defaultValue={str(bundle.religion?.SubCaste)}
                  />
                </div>
              </OnboardingStepForm>
              <Button type="button" variant="ghost" onClick={goNext}>
                Skip religion for now
              </Button>
            </div>
          ) : null}

          {step === "family" ? (
            <div className="space-y-8">
              <OnboardingStepForm
                action={saveFamilyAction}
                onSuccess={onSaved}
                submitLabel="Save family info"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    name="fatherName"
                    label="Father's name"
                    defaultValue={str(bundle.family?.FatherName)}
                  />
                  <TextField
                    name="fatherOccupation"
                    label="Father's occupation"
                    defaultValue={str(bundle.family?.FatherOccupation)}
                  />
                  <TextField
                    name="motherName"
                    label="Mother's name"
                    defaultValue={str(bundle.family?.MotherName)}
                  />
                  <TextField
                    name="motherOccupation"
                    label="Mother's occupation"
                    defaultValue={str(bundle.family?.MotherOccupation)}
                  />
                  <SelectField
                    name="familyType"
                    label="Family type"
                    options={FAMILY_TYPE_OPTIONS}
                    defaultValue={str(bundle.family?.FamilyType)}
                  />
                  <SelectField
                    name="familyValues"
                    label="Family values"
                    options={FAMILY_VALUES_OPTIONS}
                    defaultValue={str(bundle.family?.FamilyValues)}
                  />
                  <SelectField
                    name="familyStatus"
                    label="Family status"
                    options={FAMILY_STATUS_OPTIONS}
                    defaultValue={str(bundle.family?.FamilyStatus)}
                  />
                  <TextField
                    name="nativePlace"
                    label="Native place"
                    defaultValue={str(bundle.family?.NativePlace)}
                  />
                  <TextField
                    name="familyCity"
                    label="Family city"
                    defaultValue={str(bundle.family?.FamilyCity)}
                  />
                  <TextField
                    name="familyState"
                    label="Family state"
                    defaultValue={str(bundle.family?.FamilyState)}
                  />
                </div>
                <TextAreaField
                  name="aboutFamily"
                  label="About family"
                  defaultValue={str(bundle.family?.AboutFamily)}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="hasChildren"
                    defaultChecked={bundle.family?.HasChildren === true}
                  />
                  Has children (private by default)
                </label>
                <TextField
                  name="childrenCount"
                  label="Children count"
                  type="number"
                  defaultValue={str(bundle.family?.ChildrenCount)}
                />
              </OnboardingStepForm>

              <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
                <div>
                  <h3 className="font-medium">Extended family (optional)</h3>
                  <p className="text-sm text-muted-foreground">
                    Maternal/paternal relatives are never required for profile
                    activation.
                  </p>
                </div>

                {familyMembers.length > 0 ? (
                  <ul className="space-y-2">
                    {familyMembers.map((member) => (
                      <li
                        key={str(member.Id)}
                        className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                      >
                        <span>
                          {str(member.RelationshipType).replaceAll("_", " ")}
                          {member.Name ? ` — ${str(member.Name)}` : ""}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await deleteFamilyMemberAction(str(member.Id));
                            setFamilyMembers((prev) =>
                              prev.filter((item) => item.Id !== member.Id),
                            );
                          }}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No extended family members added.
                  </p>
                )}

                <OnboardingStepForm
                  action={addFamilyMemberAction}
                  submitLabel="+ Add family member"
                  onSuccess={() => {
                    router.refresh();
                  }}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      name="relationshipType"
                      label="Relationship"
                      required
                      allowEmpty={false}
                      options={EXTENDED_RELATIONSHIP_OPTIONS}
                      defaultValue="other"
                    />
                    <TextField name="name" label="Name" />
                    <TextField name="occupation" label="Occupation" />
                    <TextField name="location" label="Location" />
                    <TextField name="maritalStatus" label="Marital status" />
                  </div>
                  <TextAreaField name="notes" label="Notes" />
                </OnboardingStepForm>
              </div>

              <Button type="button" variant="ghost" onClick={goNext}>
                Skip / continue without family details
              </Button>
            </div>
          ) : null}

          {step === "lifestyle" ? (
            <OnboardingStepForm action={saveLifestyleAction} onSuccess={onSaved}>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  name="diet"
                  label="Diet"
                  options={DIET_OPTIONS}
                  defaultValue={str(bundle.lifestyle?.Diet)}
                />
                <SelectField
                  name="smoking"
                  label="Smoking"
                  options={HABIT_OPTIONS}
                  defaultValue={str(bundle.lifestyle?.Smoking)}
                />
                <SelectField
                  name="drinking"
                  label="Drinking"
                  options={HABIT_OPTIONS}
                  defaultValue={str(bundle.lifestyle?.Drinking)}
                />
                <TextField
                  name="exercise"
                  label="Exercise"
                  defaultValue={str(bundle.lifestyle?.Exercise)}
                />
                <TextField
                  name="pets"
                  label="Pets"
                  defaultValue={str(bundle.lifestyle?.Pets)}
                />
              </div>
              <TextAreaField
                name="hobbies"
                label="Hobbies"
                defaultValue={str(bundle.lifestyle?.Hobbies)}
              />
              <TextAreaField
                name="interests"
                label="Interests"
                defaultValue={str(bundle.lifestyle?.Interests)}
              />
              <TextAreaField
                name="weekendActivities"
                label="Weekend activities"
                defaultValue={str(bundle.lifestyle?.WeekendActivities)}
              />
            </OnboardingStepForm>
          ) : null}

          {step === "horoscope" ? (
            <HoroscopeForm
              values={bundle.horoscope}
              kundliDocuments={bundle.kundliDocuments ?? []}
              showSkip
              onSkip={goNext}
            />
          ) : null}

          {step === "preferences" ? (
            <OnboardingStepForm
              action={savePreferencesAction}
              onSuccess={onSaved}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  name="minAge"
                  label="Min age"
                  type="number"
                  defaultValue={str(bundle.preferences?.MinAge)}
                />
                <TextField
                  name="maxAge"
                  label="Max age"
                  type="number"
                  defaultValue={str(bundle.preferences?.MaxAge)}
                />
                <TextField
                  name="minHeightCm"
                  label="Min height (cm)"
                  type="number"
                  defaultValue={str(bundle.preferences?.MinHeightCm)}
                />
                <TextField
                  name="maxHeightCm"
                  label="Max height (cm)"
                  type="number"
                  defaultValue={str(bundle.preferences?.MaxHeightCm)}
                />
                <SelectField
                  name="preferredGender"
                  label="Preferred gender"
                  options={GENDER_OPTIONS}
                  defaultValue={str(bundle.preferences?.PreferredGender)}
                />
                <TextField
                  name="educationPreferences"
                  label="Education preference"
                  defaultValue={str(bundle.preferences?.EducationPreferences)}
                />
                <TextField
                  name="occupationPreferences"
                  label="Occupation preference"
                  defaultValue={str(bundle.preferences?.OccupationPreferences)}
                />
                <SelectField
                  name="dietPreferences"
                  label="Diet preference"
                  options={DIET_OPTIONS}
                  defaultValue={str(bundle.preferences?.DietPreferences)}
                />
                <SelectField
                  name="smokingPreferences"
                  label="Smoking preference"
                  options={HABIT_OPTIONS}
                  defaultValue={str(bundle.preferences?.SmokingPreferences)}
                />
                <SelectField
                  name="drinkingPreferences"
                  label="Drinking preference"
                  options={HABIT_OPTIONS}
                  defaultValue={str(bundle.preferences?.DrinkingPreferences)}
                />
                <TextField
                  name="religions"
                  label="Preferred religions"
                  defaultValue={str(bundle.preferences?.Religions)}
                />
                <TextField
                  name="motherTongues"
                  label="Preferred mother tongues"
                  defaultValue={str(bundle.preferences?.MotherTongues)}
                />
                <TextField
                  name="communities"
                  label="Preferred communities"
                  defaultValue={str(bundle.preferences?.Communities)}
                />
                <SelectField
                  name="manglikPreferences"
                  label="Manglik preference"
                  options={MANGLIK_OPTIONS}
                  defaultValue={str(bundle.preferences?.ManglikPreferences)}
                />
                <SelectField
                  name="rashiPreferences"
                  label="Rashi preference"
                  options={RASHI_OPTIONS}
                  defaultValue={str(bundle.preferences?.RashiPreferences)}
                />
                <TextField
                  name="nakshatraPreferences"
                  label="Nakshatra preference"
                  defaultValue={str(bundle.preferences?.NakshatraPreferences)}
                />
                <TextField
                  name="gotraPreferences"
                  label="Gotra preference"
                  defaultValue={str(bundle.preferences?.GotraPreferences)}
                />
                <SelectField
                  name="familyTypes"
                  label="Preferred family type"
                  options={FAMILY_TYPE_OPTIONS}
                  defaultValue={str(bundle.preferences?.FamilyTypes)}
                />
                <SelectField
                  name="familyValues"
                  label="Preferred family values"
                  options={FAMILY_VALUES_OPTIONS}
                  defaultValue={str(bundle.preferences?.FamilyValues)}
                />
                <TextField
                  name="countries"
                  label="Preferred countries"
                  defaultValue={str(bundle.preferences?.Countries)}
                />
                <TextField
                  name="states"
                  label="Preferred states"
                  defaultValue={str(bundle.preferences?.States)}
                />
                <TextField
                  name="cities"
                  label="Preferred cities"
                  defaultValue={str(bundle.preferences?.Cities)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="willingToRelocate"
                  defaultChecked={bundle.preferences?.WillingToRelocate === true}
                />
                Willing to relocate
              </label>
              <TextAreaField
                name="notes"
                label="Other preferences"
                defaultValue={str(bundle.preferences?.Notes)}
              />
            </OnboardingStepForm>
          ) : null}

          {step === "review" ? (
            <div className="space-y-5">
              <div className="space-y-2">
                {sections.map((section) => (
                  <div
                    key={section.key}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <span>
                      {section.complete ? "✓" : "○"} {section.label}
                    </span>
                    <span className="text-muted-foreground">
                      {section.earned}/{section.weight}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Photo upload arrives in Phase 3 and is not required to activate
                your profile. Extended family is never required.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={goPrev}>
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={pendingFinish}
                  onClick={() => {
                    setSections(bundle.completion.sections);
                    startFinish(async () => {
                      await finishOnboardingAction();
                    });
                  }}
                >
                  {pendingFinish ? "Activating…" : "Activate profile"}
                </Button>
              </div>
            </div>
          ) : null}

          {step !== "review" && step !== "basic" ? (
            <div className="flex justify-start">
              <Button type="button" variant="ghost" onClick={goPrev}>
                Back
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
