<template>
  <div class="signing-ceremony">
    <!-- Step Indicator -->
    <div class="flex items-center justify-center space-x-4 mb-8">
      <!-- Identity Verification Step (Enhanced tier only) -->
      <template v-if="requiresIdentityVerification">
        <div :class="stepClass(1)">
          <div :class="stepCircleClass(1)">1</div>
          <p class="text-xs mt-2">Verify</p>
        </div>
        <div class="h-0.5 w-12 bg-slate-300" :class="{ 'bg-[#C41E3A]': currentStep > 1 }"></div>
      </template>

      <div :class="stepClass(reviewStep)">
        <div :class="stepCircleClass(reviewStep)">{{ reviewStep }}</div>
        <p class="text-xs mt-2">Review</p>
      </div>
      <div class="h-0.5 w-12 bg-slate-300" :class="{ 'bg-[#C41E3A]': currentStep > reviewStep }"></div>
      <div :class="stepClass(signStep)">
        <div :class="stepCircleClass(signStep)">{{ signStep }}</div>
        <p class="text-xs mt-2">Sign</p>
      </div>
      <div class="h-0.5 w-12 bg-slate-300" :class="{ 'bg-[#C41E3A]': currentStep > signStep }"></div>
      <div :class="stepClass(completeStep)">
        <div :class="stepCircleClass(completeStep)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p class="text-xs mt-2">Complete</p>
      </div>
    </div>

    <!-- Step: Identity Verification (Enhanced tier only) -->
    <div v-if="requiresIdentityVerification && currentStep === 1 && !identityVerified">
      <IdentityVerification
        :token="token"
        :signer="signer"
        :mode="verificationMode"
        :require-ssn="requireSsn"
        @verified="handleIdentityVerified"
        @pending-review="handlePendingReview"
      />
    </div>

    <!-- Step: Review Document -->
    <div v-if="currentStep === reviewStep" class="space-y-6">
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h3 class="text-lg font-semibold text-slate-900">{{ document.title }}</h3>
          <p v-if="document.description" class="text-sm text-slate-600 mt-1">
            {{ document.description }}
          </p>
        </div>

        <!-- Document Preview -->
        <div class="p-6 max-h-[60vh] overflow-y-auto">
          <div
            class="prose prose-slate max-w-none"
            v-html="document.content"
          />
        </div>
      </div>

      <!-- Identity Verified Badge (for Enhanced tier) -->
      <div v-if="identityVerified" class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-start">
          <svg class="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <h4 class="font-medium text-green-800">Identity Verified</h4>
            <p class="text-sm text-green-700 mt-1">
              Your identity has been verified via {{ verificationMethodDisplay }}.
            </p>
          </div>
        </div>
      </div>

      <!-- Review Acknowledgment -->
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div class="flex items-start">
          <svg class="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 class="font-medium text-amber-800">Please review carefully</h4>
            <p class="text-sm text-amber-700 mt-1">
              Read the entire document before proceeding to sign. Your electronic signature will be legally binding.
            </p>
          </div>
        </div>
      </div>

      <div class="flex justify-end">
        <button
          @click="proceedToSign"
          class="px-6 py-3 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors"
        >
          I've Reviewed - Proceed to Sign
        </button>
      </div>
    </div>

    <!-- Step: Sign Document -->
    <div v-if="currentStep === signStep" class="space-y-6">
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h3 class="text-lg font-semibold text-slate-900 mb-2">Sign Document</h3>
        <p class="text-slate-600 mb-6">
          {{ storedSignature ? 'Choose how you want to sign this document.' : 'Please sign below using your mouse or finger (on touch devices).' }}
        </p>

        <!-- Signer Info -->
        <div class="bg-slate-50 rounded-lg p-4 mb-6">
          <div class="flex items-center">
            <div class="w-10 h-10 bg-[#0A2540] rounded-full flex items-center justify-center text-white font-semibold mr-3">
              {{ signerInitials }}
            </div>
            <div>
              <p class="font-medium text-slate-900">{{ signer.name }}</p>
              <p class="text-sm text-slate-600">{{ signer.email }}</p>
            </div>
          </div>
        </div>

        <!-- Signature Method Toggle -->
        <div class="mb-6">
          <p class="text-sm font-medium text-slate-700 mb-3">Choose how to sign:</p>
          <div class="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              type="button"
              @click="signatureMethod = 'draw'"
              class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
              :class="signatureMethod === 'draw'
                ? 'bg-[#0A2540] text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'"
            >
              <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Draw
            </button>
            <button
              type="button"
              @click="signatureMethod = 'upload'"
              class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
              :class="signatureMethod === 'upload'
                ? 'bg-[#0A2540] text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'"
            >
              <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upload
            </button>
            <button
              v-if="storedSignature"
              type="button"
              @click="signatureMethod = 'stored'"
              class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
              :class="signatureMethod === 'stored'
                ? 'bg-[#0A2540] text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'"
            >
              <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Saved
            </button>
          </div>
        </div>

        <!-- Draw Signature -->
        <div v-if="signatureMethod === 'draw'" class="mb-6">
          <SignatureCanvas
            ref="signatureCanvasRef"
            :has-error="signatureError && signatureMethod === 'draw'"
            error-message="Please provide your signature to continue"
            @update:signature="handleSignatureUpdate"
            @change="handleSignatureChange"
          />
        </div>

        <!-- Upload Signature -->
        <div v-else-if="signatureMethod === 'upload'" class="mb-6">
          <div
            v-if="!uploadedSignature"
            class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all"
            :class="isDragging
              ? 'border-[#C41E3A] bg-red-50'
              : signatureError && signatureMethod === 'upload'
                ? 'border-red-400 bg-red-50'
                : 'border-slate-300 hover:border-[#C41E3A] hover:bg-slate-50'"
            @click="triggerSignatureUpload"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleSignatureDrop"
          >
            <input
              ref="signatureFileInputRef"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              class="hidden"
              @change="handleSignatureFileSelect"
            />
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p class="text-slate-700 font-medium mb-1">Upload Your Signature</p>
            <p class="text-sm text-slate-500">PNG, JPG, or SVG - Click or drag and drop</p>
            <p class="text-xs text-slate-400 mt-2">Image should have a transparent or white background</p>
          </div>

          <!-- Uploaded Signature Preview -->
          <div v-else class="border-2 border-slate-200 rounded-lg p-6 bg-slate-50">
            <p class="text-sm font-medium text-slate-700 mb-3 text-center">Your Uploaded Signature:</p>
            <div class="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-center min-h-[120px]">
              <img
                :src="uploadedSignature"
                alt="Your uploaded signature"
                class="max-h-24 max-w-full object-contain"
              />
            </div>
            <div class="flex justify-center mt-4">
              <button
                type="button"
                @click="clearUploadedSignature"
                class="text-sm text-slate-600 hover:text-red-600 font-medium"
              >
                Remove and upload different image
              </button>
            </div>
          </div>

          <!-- Adoption for uploaded signature -->
          <div
            v-if="uploadedSignature"
            class="mt-4 border-2 rounded-lg p-4 transition-all"
            :class="uploadedSignatureAdopted
              ? 'border-green-400 bg-green-50'
              : signatureError && signatureMethod === 'upload'
                ? 'border-red-400 bg-red-50'
                : 'border-amber-300 bg-amber-50'"
          >
            <label class="flex items-start cursor-pointer" role="checkbox" :aria-checked="uploadedSignatureAdopted">
              <div class="relative flex-shrink-0 mt-0.5">
                <input type="checkbox" v-model="uploadedSignatureAdopted" class="sr-only" />
                <div
                  class="w-6 h-6 rounded border-2 flex items-center justify-center transition-all"
                  :class="uploadedSignatureAdopted
                    ? 'bg-green-600 border-green-600'
                    : signatureError && signatureMethod === 'upload'
                      ? 'bg-white border-red-500'
                      : 'bg-white border-slate-400'"
                >
                  <svg v-if="uploadedSignatureAdopted" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span class="ml-3 text-sm" :class="uploadedSignatureAdopted ? 'text-green-800' : 'text-slate-800'">
                <strong>I adopt this image as my signature</strong> for this document. I confirm this represents my signature and I intend it to be legally binding.
              </span>
            </label>
          </div>

          <p v-if="signatureError && signatureMethod === 'upload' && !uploadedSignature" class="text-sm text-red-600 mt-2">
            Please upload a signature image to continue.
          </p>
          <p v-else-if="signatureError && signatureMethod === 'upload' && uploadedSignature && !uploadedSignatureAdopted" class="text-sm text-red-600 mt-2">
            Please adopt your signature to continue.
          </p>
        </div>

        <!-- Stored Signature with Adoption -->
        <div v-else-if="signatureMethod === 'stored' && storedSignature" class="mb-6">
          <div class="border-2 border-slate-200 rounded-lg p-6 bg-slate-50">
            <p class="text-sm font-medium text-slate-700 mb-3 text-center">Your Saved Signature:</p>
            <div class="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-center min-h-[120px]">
              <img
                :src="storedSignature"
                alt="Your stored signature"
                class="max-h-24 max-w-full object-contain"
              />
            </div>
          </div>

          <!-- Affirmative Adoption -->
          <div
            class="mt-4 border-2 rounded-lg p-4 transition-all"
            :class="storedSignatureAdopted
              ? 'border-green-400 bg-green-50'
              : signatureError && signatureMethod === 'stored'
                ? 'border-red-400 bg-red-50'
                : 'border-amber-300 bg-amber-50'"
          >
            <label class="flex items-start cursor-pointer" role="checkbox" :aria-checked="storedSignatureAdopted">
              <div class="relative flex-shrink-0 mt-0.5">
                <input type="checkbox" v-model="storedSignatureAdopted" class="sr-only" />
                <div
                  class="w-6 h-6 rounded border-2 flex items-center justify-center transition-all"
                  :class="storedSignatureAdopted
                    ? 'bg-green-600 border-green-600'
                    : signatureError && signatureMethod === 'stored'
                      ? 'bg-white border-red-500'
                      : 'bg-white border-slate-400'"
                >
                  <svg v-if="storedSignatureAdopted" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span class="ml-3 text-sm" :class="storedSignatureAdopted ? 'text-green-800' : 'text-slate-800'">
                <strong>I adopt this signature</strong> as my own for this document. I confirm this is my signature and I intend it to be legally binding.
              </span>
            </label>
          </div>

          <p v-if="signatureError && signatureMethod === 'stored' && !storedSignatureAdopted" class="text-sm text-red-600 mt-2">
            Please adopt your signature to continue.
          </p>
        </div>

        <!-- Legal Consent Section - Prominent and Accessible -->
        <div
          class="border-2 rounded-xl p-6 mt-6 transition-all duration-200"
          :class="termsAccepted
            ? 'border-green-500 bg-green-50'
            : termsError
              ? 'border-red-500 bg-red-50'
              : 'border-amber-400 bg-amber-50'"
        >
          <!-- Legal Notice Header -->
          <div class="flex items-center mb-4">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0"
              :class="termsAccepted ? 'bg-green-200' : 'bg-amber-200'"
            >
              <svg v-if="termsAccepted" class="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <svg v-else class="w-7 h-7 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4
                class="text-lg font-bold"
                :class="termsAccepted ? 'text-green-800' : 'text-amber-800'"
              >
                {{ termsAccepted ? 'Legal Agreement Accepted' : 'Legal Agreement Required' }}
              </h4>
              <p class="text-sm" :class="termsAccepted ? 'text-green-700' : 'text-amber-700'">
                This is a legally binding action
              </p>
            </div>
          </div>

          <!-- Clear Explanation -->
          <div
            class="rounded-lg p-4 mb-4"
            :class="termsAccepted ? 'bg-green-100' : 'bg-white border border-amber-300'"
          >
            <p class="text-base leading-relaxed" :class="termsAccepted ? 'text-green-800' : 'text-slate-800'">
              <strong>By signing this document, you are:</strong>
            </p>
            <ul class="mt-3 space-y-2 text-base" :class="termsAccepted ? 'text-green-700' : 'text-slate-700'">
              <li class="flex items-start">
                <svg class="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" :class="termsAccepted ? 'text-green-600' : 'text-amber-600'" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span>Creating a <strong>legally binding signature</strong> equal to a handwritten signature</span>
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" :class="termsAccepted ? 'text-green-600' : 'text-amber-600'" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span>Agreeing to the terms of the document you reviewed</span>
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" :class="termsAccepted ? 'text-green-600' : 'text-amber-600'" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span>Acknowledging this action <strong>cannot be undone</strong></span>
              </li>
            </ul>
          </div>

          <!-- Checkbox with Large Touch Target -->
          <label
            class="flex items-center p-4 rounded-lg cursor-pointer transition-all border-2"
            :class="termsAccepted
              ? 'bg-green-200 border-green-400'
              : termsError
                ? 'bg-red-100 border-red-400'
                : 'bg-white border-slate-300 hover:border-amber-400 hover:bg-amber-50'"
            role="checkbox"
            :aria-checked="termsAccepted"
            tabindex="0"
            @keydown.space.prevent="termsAccepted = !termsAccepted"
            @keydown.enter.prevent="termsAccepted = !termsAccepted"
          >
            <div class="relative flex-shrink-0">
              <input
                type="checkbox"
                v-model="termsAccepted"
                class="sr-only"
                aria-describedby="terms-description"
              />
              <div
                class="w-8 h-8 rounded-md border-2 flex items-center justify-center transition-all"
                :class="termsAccepted
                  ? 'bg-green-600 border-green-600'
                  : termsError
                    ? 'bg-white border-red-500'
                    : 'bg-white border-slate-400'"
              >
                <svg v-if="termsAccepted" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <span id="terms-description" class="ml-4 text-base font-medium" :class="termsAccepted ? 'text-green-800' : 'text-slate-800'">
              I understand and agree that my electronic signature is legally binding.
              <button
                type="button"
                @click.stop="showTerms = true"
                class="underline font-semibold ml-1"
                :class="termsAccepted ? 'text-green-700 hover:text-green-900' : 'text-[#C41E3A] hover:text-[#a31830]'"
              >
                View full consent terms
              </button>
            </span>
          </label>

          <!-- Error Message -->
          <div v-if="termsError" class="mt-4 flex items-center text-red-700 bg-red-100 rounded-lg p-3">
            <svg class="w-6 h-6 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">Please check the box above to confirm you understand this is a legal agreement.</span>
          </div>
        </div>
      </div>

      <div class="flex justify-between">
        <button
          @click="currentStep = reviewStep"
          class="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
        >
          Back to Review
        </button>
        <button
          @click="submitSignature"
          :disabled="isSubmitting || hasSigned"
          class="px-6 py-3 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <span v-if="isSubmitting" class="mr-2">
            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
          {{ isSubmitting ? 'Submitting...' : hasSigned ? 'Signature Submitted' : 'Submit Signature' }}
        </button>
      </div>
    </div>

    <!-- Step: Confirmation -->
    <div v-if="currentStep === completeStep" class="text-center">
      <div class="bg-white rounded-lg shadow-lg p-8">
        <!-- Already Signed Notice -->
        <template v-if="alreadySignedError">
          <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 class="text-2xl font-bold text-slate-900 mb-2">Document Already Signed</h2>
          <p class="text-slate-600 mb-8">
            This document has already been signed. No further action is needed.
          </p>
        </template>

        <!-- Normal Success -->
        <template v-else>
          <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 class="text-2xl font-bold text-slate-900 mb-2">Document Signed Successfully!</h2>
          <p class="text-slate-600 mb-8">
            Your signature has been recorded and a confirmation has been sent to your email.
          </p>
        </template>

        <!-- Certificate Info (only show if we have the data) -->
        <div v-if="certificateInfo || signedAt" class="bg-slate-50 rounded-lg p-6 text-left max-w-md mx-auto mb-6">
          <h4 class="font-semibold text-slate-900 mb-4">Signature Certificate</h4>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-600">Document:</span>
              <span class="font-medium text-slate-900">{{ document.title }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">Signed by:</span>
              <span class="font-medium text-slate-900">{{ signer.name }}</span>
            </div>
            <div v-if="signedAt" class="flex justify-between">
              <span class="text-slate-600">Date:</span>
              <span class="font-medium text-slate-900">{{ signedAt }}</span>
            </div>
            <div v-if="certificateInfo" class="pt-3 border-t border-slate-200">
              <span class="text-slate-600">Certificate ID:</span>
              <p class="font-mono text-xs text-slate-700 mt-1 break-all">
                {{ certificateInfo.id }}
              </p>
            </div>
          </div>
        </div>

        <!-- Download Button -->
        <div class="flex justify-center gap-4 mb-6">
          <button
            @click="downloadSignedPdf"
            :disabled="isDownloading"
            class="px-6 py-3 bg-[#0A2540] text-white rounded-lg font-semibold hover:bg-[#0d3356] transition-colors flex items-center disabled:opacity-50"
          >
            <svg v-if="!isDownloading" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <svg v-else class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isDownloading ? 'Downloading...' : 'Download Signed PDF' }}
          </button>
        </div>

        <p class="text-sm text-slate-500">
          You may close this window. A copy of the signed document is also available in your account.
        </p>
      </div>
    </div>

    <!-- Terms Modal -->
    <Teleport to="body">
      <div
        v-if="showTerms"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="showTerms = false"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div class="p-6 border-b border-slate-200">
            <h3 class="text-xl font-semibold text-slate-900">Electronic Signature Consent</h3>
          </div>
          <div class="p-6 overflow-y-auto max-h-[50vh]">
            <div class="prose prose-sm prose-slate">
              <p>
                By checking the box and signing electronically, you consent to conduct this transaction electronically
                and agree that your electronic signature has the same legal effect as a handwritten signature.
              </p>
              <h4>Your Rights</h4>
              <ul>
                <li>You have the right to receive paper documents instead of electronic documents.</li>
                <li>You may withdraw your consent to receive documents electronically at any time.</li>
                <li>You may request a paper copy of any document provided electronically.</li>
              </ul>
              <h4>System Requirements</h4>
              <p>
                To access and retain electronic documents, you need a device with internet access and a current
                web browser that supports JavaScript and cookies.
              </p>
              <h4>Legal Validity</h4>
              <p>
                Electronic signatures are legally binding under the Electronic Signatures in Global and National
                Commerce Act (ESIGN Act) and the Uniform Electronic Transactions Act (UETA).
              </p>
            </div>
          </div>
          <div class="p-6 border-t border-slate-200 flex justify-end">
            <button
              @click="showTerms = false"
              class="px-6 py-2 bg-[#0A2540] text-white rounded-lg font-medium hover:bg-[#0d3356] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SignatureCanvas from './SignatureCanvas.vue'
import IdentityVerification from './IdentityVerification.vue'

interface DocumentInfo {
  id: string
  title: string
  description?: string
  content: string
}

interface SignerInfo {
  name: string
  email: string
}

interface CertificateInfo {
  id: string
  documentHash: string
  signatureHash: string
  certificateHash: string
}

interface Props {
  document: DocumentInfo
  signer: SignerInfo
  token: string
  // Enhanced tier identity verification
  requiresIdentityVerification?: boolean
  identityVerified?: boolean
  verificationMode?: 'attestation' | 'kba' | 'manual' | 'persona'
  requireSsn?: boolean
  // Stored signature image (optional)
  storedSignature?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  requiresIdentityVerification: false,
  identityVerified: false,
  verificationMode: 'attestation',
  requireSsn: false,
  storedSignature: null
})

const emit = defineEmits<{
  'signed': [certificate: CertificateInfo]
  'error': [message: string]
  'identity-verified': [data: { method: string; verifiedAt: string }]
  'pending-review': []
}>()

// Local identity verification state (tracks verification within this session)
const localIdentityVerified = ref(props.identityVerified)
const localVerificationMethod = ref<string | null>(null)

// Computed: whether identity is verified (from props or local state)
const identityVerified = computed(() => props.identityVerified || localIdentityVerified.value)

// Dynamic step numbers based on whether verification is required
const reviewStep = computed(() => props.requiresIdentityVerification ? 2 : 1)
const signStep = computed(() => props.requiresIdentityVerification ? 3 : 2)
const completeStep = computed(() => props.requiresIdentityVerification ? 4 : 3)

// Display name for verification method
const verificationMethodDisplay = computed(() => {
  const method = localVerificationMethod.value
  switch (method) {
    case 'attestation': return 'self-attestation'
    case 'kba': return 'knowledge-based verification'
    case 'manual': return 'manual ID review'
    case 'persona': return 'identity verification'
    default: return 'identity verification'
  }
})

// Initialize step based on whether verification is required and already done
const getInitialStep = () => {
  if (props.requiresIdentityVerification && !props.identityVerified) {
    return 1 // Start at identity verification
  }
  return props.requiresIdentityVerification ? 2 : 1 // Start at review
}
const currentStep = ref(getInitialStep())
const signatureCanvasRef = ref<InstanceType<typeof SignatureCanvas> | null>(null)
const signatureData = ref<string | null>(null)
const termsAccepted = ref(false)
const showTerms = ref(false)
const isSubmitting = ref(false)
const signatureError = ref(false)
const termsError = ref(false)
const certificateInfo = ref<CertificateInfo | null>(null)
const signedAt = ref('')
const isDownloading = ref(false)
const hasSigned = ref(false) // Track if signature was successfully submitted
const alreadySignedError = ref(false) // Track if document was already signed

// Signature method: draw, upload, or stored
const signatureMethod = ref<'draw' | 'upload' | 'stored'>(
  props.storedSignature ? 'stored' : 'draw'
)
const storedSignatureAdopted = ref(false)

// Upload signature state
const uploadedSignature = ref<string | null>(null)
const uploadedSignatureAdopted = ref(false)
const isDragging = ref(false)
const signatureFileInputRef = ref<HTMLInputElement | null>(null)

const signerInitials = computed(() => {
  const parts = props.signer.name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return parts[0]?.substring(0, 2).toUpperCase() || '??'
})

const stepClass = (step: number) => {
  return currentStep.value >= step ? 'text-[#C41E3A] font-semibold' : 'text-slate-400'
}

const stepCircleClass = (step: number) => {
  const base = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold'
  return currentStep.value >= step
    ? `${base} bg-[#C41E3A] text-white`
    : `${base} bg-slate-200 text-slate-500`
}

const proceedToSign = () => {
  currentStep.value = signStep.value
}

// Identity verification handlers
const handleIdentityVerified = (data: { method: string; verifiedAt: string }) => {
  localIdentityVerified.value = true
  localVerificationMethod.value = data.method
  currentStep.value = reviewStep.value // Move to review step
  emit('identity-verified', data)
}

const handlePendingReview = () => {
  emit('pending-review')
}

const handleSignatureUpdate = (data: string | null) => {
  signatureData.value = data
  if (data) {
    signatureError.value = false
  }
}

const handleSignatureChange = (hasSignature: boolean) => {
  if (hasSignature) {
    signatureError.value = false
  }
}

// Upload signature handlers
const triggerSignatureUpload = () => {
  signatureFileInputRef.value?.click()
}

const handleSignatureFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processSignatureFile(file)
  }
  // Reset input so same file can be selected again
  target.value = ''
}

const handleSignatureDrop = (event: DragEvent) => {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    processSignatureFile(file)
  }
}

const processSignatureFile = (file: File) => {
  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml']
  if (!validTypes.includes(file.type)) {
    alert('Please upload a PNG, JPG, or SVG image.')
    return
  }

  // Validate file size (max 500KB)
  if (file.size > 500 * 1024) {
    alert('Image must be smaller than 500KB.')
    return
  }

  // Read file as data URL
  const reader = new FileReader()
  reader.onload = (e) => {
    uploadedSignature.value = e.target?.result as string
    uploadedSignatureAdopted.value = false // Reset adoption when new image uploaded
    signatureError.value = false
  }
  reader.onerror = () => {
    alert('Failed to read image file.')
  }
  reader.readAsDataURL(file)
}

const clearUploadedSignature = () => {
  uploadedSignature.value = null
  uploadedSignatureAdopted.value = false
}

const submitSignature = async () => {
  // Validate
  signatureError.value = false
  termsError.value = false

  // Determine which signature to use based on method
  let finalSignatureData: string | null = null
  let signatureSource: 'stored' | 'drawn' | 'uploaded' = 'drawn'

  switch (signatureMethod.value) {
    case 'stored':
      // Using stored signature - must be adopted
      if (!props.storedSignature) {
        signatureError.value = true
        return
      }
      if (!storedSignatureAdopted.value) {
        signatureError.value = true
        return
      }
      finalSignatureData = props.storedSignature
      signatureSource = 'stored'
      break

    case 'upload':
      // Using uploaded signature - must be uploaded and adopted
      if (!uploadedSignature.value) {
        signatureError.value = true
        return
      }
      if (!uploadedSignatureAdopted.value) {
        signatureError.value = true
        return
      }
      finalSignatureData = uploadedSignature.value
      signatureSource = 'uploaded'
      break

    case 'draw':
    default:
      // Using drawn signature
      if (!signatureData.value) {
        signatureError.value = true
        return
      }
      finalSignatureData = signatureData.value
      signatureSource = 'drawn'
      break
  }

  if (!termsAccepted.value) {
    termsError.value = true
    return
  }

  // Prevent duplicate submissions
  if (hasSigned.value) {
    return
  }

  isSubmitting.value = true

  try {
    const response = await $fetch(`/api/signature/${props.token}/sign`, {
      method: 'POST',
      body: {
        signatureData: finalSignatureData,
        agreedToTerms: true,
        termsVersion: '2024.1',
        // Include metadata about signature source (backend accepts 'stored' or 'drawn')
        signatureSource: signatureSource === 'uploaded' ? 'drawn' : signatureSource
      }
    })

    if (response.success) {
      hasSigned.value = true // Mark as signed to prevent re-submission
      certificateInfo.value = response.data.certificate
      signedAt.value = new Date(response.data.signedAt).toLocaleString()
      currentStep.value = completeStep.value
      emit('signed', response.data.certificate)
    }
  } catch (error: any) {
    const statusCode = error.statusCode || error.data?.statusCode
    const message = error.data?.message || error.message || 'Failed to submit signature'

    // Handle "already signed" error gracefully
    if (statusCode === 410 && message.toLowerCase().includes('already been signed')) {
      alreadySignedError.value = true
      hasSigned.value = true
      // Move to confirmation step with a note that it was previously signed
      currentStep.value = completeStep.value
    } else {
      emit('error', message)
      alert(message)
    }
  } finally {
    isSubmitting.value = false
  }
}

const downloadSignedPdf = async () => {
  isDownloading.value = true
  try {
    const response = await fetch(`/api/signature/${props.token}/download`)
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Download failed: ${response.status} - ${errorText}`)
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = `${props.document.title || 'document'} - Signed.pdf`
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    console.error('Download error:', error)
    alert(`Failed to download: ${error.message || 'Unknown error'}`)
  } finally {
    isDownloading.value = false
  }
}
</script>
