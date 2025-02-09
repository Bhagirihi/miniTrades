"use client"; // Ensures animations run only on the client

import { motion } from "framer-motion"; // For animations
import { Container } from "@/components/Container";
import { Hero } from "@/components/Hero";
import { SectionTitle } from "@/components/SectionTitle";
import { Benefits } from "@/components/Benefits";
import { Video } from "@/components/Video";
import { Testimonials } from "@/components/Testimonials";
import { Faq } from "@/components/Faq";
import { Cta } from "@/components/Cta";
import { benefitOne, benefitTwo } from "@/components/data";

// Animation Variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: "easeInOut" } },
};

export default function Root() {
  return (
    <Container>
      {/* Hero Section with animation */}
      <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
        <Hero />
      </motion.div>

      {/* Benefits Section */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <SectionTitle
          preTitle="Nextly Benefits"
          title="Why should you use this landing page"
        >
          Nextly is a free landing page & marketing website template for
          startups and indie projects. It&#39;s built with Next.js &
          TailwindCSS. And it&#39;s completely open-source.
        </SectionTitle>
      </motion.div>

      {/* Benefits with Animations */}
      <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
        <Benefits data={benefitOne} />
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
        <Benefits imgPos="right" data={benefitTwo} />
      </motion.div>

      {/* Video Section */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <SectionTitle
          preTitle="Watch a Video"
          title="Learn how to fulfill your needs"
        >
          This section is to highlight a promo or demo video of your product.
          Analysts say a landing page with video has a **3% higher conversion
          rate**. So, don&apos;t forget to add one. Just like this.
        </SectionTitle>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
        <Video videoId="fZ0D0cnR88E" />
      </motion.div>

      {/* Testimonials Section */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <SectionTitle
          preTitle="Testimonials"
          title="Here&#39;s what our customers said"
        >
          Testimonials are a great way to increase brand trust and awareness.
          Use this section to highlight your popular customers.
        </SectionTitle>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
        <Testimonials />
      </motion.div>

      {/* FAQ Section */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <SectionTitle preTitle="FAQ" title="Frequently Asked Questions">
          Answer your customers&#39; possible questions here. This will increase
          the conversion rate as well as reduce support or chat requests.
        </SectionTitle>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
        <Faq />
      </motion.div>

      {/* Call to Action */}
      <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
        <Cta />
      </motion.div>
    </Container>
  );
}
