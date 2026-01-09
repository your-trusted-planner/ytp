export default defineNuxtPlugin(() => {
  // Only run in browser
  if (import.meta.client) {
    const config = useRuntimeConfig()
    const commitHash = config.public.gitCommit || 'unknown'
    const buildDate = config.public.buildDate || 'unknown'

    console.log(`
%c🏔️ Built with ❤️ in Northern Colorado
%cCommit: ${commitHash}
%cBuild: ${buildDate}

%c🛠️ Hey DIY developer! 
%cIf you're poking around in here, you're probably the type who
builds things yourself. I get it - I'm an attorney who dabbles.
Whether you need legal help for your side project or just want
to connect with someone who speaks both law and code...

%cLet's chat: owen@yourtrustedplanner.com
%c"Make money by doing good things and build cool stuff" - Owen
`,
    'color: #2563eb; font-size: 16px; font-weight: bold;',
    'color: #64748b; font-size: 12px;',
    'color: #64748b; font-size: 12px;',
    'color: #059669; font-size: 14px; font-weight: bold;',
    'color: #374151; font-size: 13px;',
    'color: #2563eb; font-size: 13px; text-decoration: underline;',
    'color: #64748b; font-size: 11px; font-style: italic;',
    )
  }
})
