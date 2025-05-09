import Header from "@/components/header";
import Footer from "@/components/footer";
import { Helmet } from "react-helmet-async";

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - Drama Llama</title>
        <meta name="description" content="Drama Llama's privacy policy - how we protect your data and respect your privacy." />
      </Helmet>

      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-bold mb-6 text-center">Privacy Policy</h1>
          
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-10">
            <h2 className="text-2xl font-bold mb-4 text-primary flex items-center">
              <span className="mr-2">🛡️</span> Your Privacy Matters
            </h2>
            <p className="mb-4">At Drama Llama AI, your privacy is our priority.</p>
            
            <ul className="space-y-4">
              <li className="flex">
                <span className="text-green-500 font-bold mr-2">✅</span>
                <span>When you use our analysis tools, your conversation content is processed through secure API connections with Anthropic (Claude AI). We store analysis results but not the raw conversations once processing is complete.</span>
              </li>
              
              <li className="flex">
                <span className="text-green-500 font-bold mr-2">✅</span>
                <span>We retain your analysis results for 90 days to provide you with historical access to your insights.</span>
              </li>
              
              <li className="flex">
                <span className="text-green-500 font-bold mr-2">✅</span>
                <span>If you choose to sign up with your email, your email address is securely stored only for account access, verification, and service updates. We never share, sell, or use your email for marketing purposes.</span>
              </li>
              
              <li className="flex">
                <span className="text-green-500 font-bold mr-2">✅</span>
                <span>We use a first-party authentication system that securely stores your login information in our encrypted database. Your password is hashed for security, and we do not have access to your original password.</span>
              </li>
              
              <li className="flex">
                <span className="text-green-500 font-bold mr-2">✅</span>
                <span>To provide our AI analysis features, your uploaded content is temporarily processed by Anthropic's Claude AI. Their use of your data is governed by their <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">privacy policy</a>.</span>
              </li>
              
              <li className="flex">
                <span className="text-green-500 font-bold mr-2">✅</span>
                <span>You can request deletion of your account and associated data at any time by contacting us at <a href="mailto:DramaLlamaConsultancy@gmail.com" className="text-primary hover:underline">DramaLlamaConsultancy@gmail.com</a>.</span>
              </li>
            </ul>
            
            <p className="mt-4">Your trust is important to us. We're committed to handling your information responsibly and transparently.</p>
          </div>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">Information We Collect</h2>
          <p>We collect and process the following information:</p>
          <ul>
            <li>Account information (email address, hashed password)</li>
            <li>Usage data (number of analyses performed)</li>
            <li>Analysis results (insights generated from your uploads)</li>
          </ul>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">How We Use Your Information</h2>
          <p>We use your information for the following purposes:</p>
          <ul>
            <li>Providing you with access to our analysis tools</li>
            <li>Maintaining your account and subscription</li>
            <li>Improving our services and features</li>
            <li>Communicating important updates or changes</li>
          </ul>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">Data Retention</h2>
          <p>We retain your data for the following periods:</p>
          <ul>
            <li>Account information: Until you request deletion</li>
            <li>Analysis results: 90 days</li>
            <li>Usage data: Until you request deletion</li>
          </ul>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">Your Rights</h2>
          <p>You have the following rights regarding your data:</p>
          <ul>
            <li>Right to access your personal data</li>
            <li>Right to request correction of inaccurate data</li>
            <li>Right to request deletion of your data</li>
            <li>Right to withdraw consent at any time</li>
          </ul>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">Contact Us</h2>
          <p>If you have any questions about this Privacy Policy or our data practices, please contact us at:</p>
          <p><a href="mailto:DramaLlamaConsultancy@gmail.com" className="text-primary hover:underline">DramaLlamaConsultancy@gmail.com</a></p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>
          <p>Last Updated: May 9, 2025</p>
        </div>
      </main>
      
      <Footer />
    </>
  );
}