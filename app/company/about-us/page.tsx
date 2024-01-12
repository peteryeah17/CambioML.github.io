'use client';

import PageHero from "@/app/components/hero/PageHero";
import Button from "../../components/Button";
import Container from "../../components/Container";
import Section from "@/app/components/Section";
import { imgPrefix } from "@/app/hooks/useImgPrefix";
import Heading from "@/app/components/Heading";
import TeamMember from "@/app/components/about-us/TeamMember";

const sections = [
    {
        title: "Who we are",
        paragraphs: ["cambioML is a team of former scientists from AWS AI building SaaS solutions enable Fortune 500 companies to build self-owned AI agents based on their massive, multi-modal and confidential data. We’re building what we wish we had when developing foundation models at Amazon."],
    },
    {
        title: "What we offer",
        paragraphs: ["We offer a suite of products that enable you to build your own AI agents based on your massive, multi-modal and confidential data. Our products are built on top of our open-source libraries, uniflow and pykoi."],
    },
]

const investors = [
    {
        image: "/images/investors/ycombinator.png",
        alt: "Y Combinator",
        url: "https://www.ycombinator.com/companies/cambioml",
    },
    {
        image: "/images/investors/general-catalyst.png",
        alt: "General Catalyst",
        url: "https://www.generalcatalyst.com/",
    },
    {
        image: "/images/investors/samsung-next.png",
        alt: "Samsung Next",
        url: "https://www.samsungnext.com/",
        height: "h-[50px]",
    },
    {
        image: "/images/investors/zvc.png",
        alt: "Z Venture Capital",
        url: "https://zvc.vc/en/",
        height: "h-[65px]",
    }
]

const AboutPage = () => {
    return (
        <div className="pb-10">
            <PageHero title="About us" />
            <Container styles="h-max" centerX center-y>
                {sections.map((section) => (
                    <div className="pt-40 max-w-[800px]">
                        <Section title={section.title} paragraphs={section.paragraphs || [""]} center />
                    </div>
                ))}
                <div className="py-20">
                    <Heading title="Founding Team" center />
                    <div className="pt-5 flex flex-row justify-center items-center w-full">
                        <TeamMember name="Rachel Hu" title="CEO" image="/images/team/rachel.png" bio="Former AWS Scientist who" url="https://www.linkedin.com/in/rachelsonghu/"/>
                        <TeamMember name="Jojo Ortiz" title="Founding Engineer" image="/images/team/jojo.png" bio="Former Tesla Engineer who" url="https://www.linkedin.com/in/joseromanortiz/"/>
                    </div>
                </div>
                <Heading title="Our Investors" center />
                <div className="pt-5 flex gap-8 max-w-800 align-items justify-items h-[100px] w-max">
                    {
                        investors.map((investor, i) => (
                            <a target="_blank" href={investor.url} rel="noopener noreferrer" key={investor.url + i}>
                                <div className={`flex items-center justify-center h-full w-max`}>
                                    <div className={`${investor.height || 'h-[100px]'} w-auto`}>
                                        <img
                                            src={imgPrefix + investor.image}
                                            alt={investor.alt}
                                            className={`cursor-pointer max-h-full max-w-full`}
                                        />
                                    </div>
                                </div>
                            </a>
                        ))
                    }
                </div>
                <div className="flex items-center align-center w-[500px] gap-5 mt-20">
                    <Button label="Get Started" onClick={() => { console.log('get started') }} />
                    <Button label="Read the documentation" onClick={() => { console.log('read') }} outline />
                </div>
            </Container>
        </div>
    )
}

export default AboutPage;