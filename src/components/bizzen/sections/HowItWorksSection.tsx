'use client';

import { Rocket, RefreshCw, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from 'next/image';
import React from 'react';

interface ProcessStep {
    key: string;
    id: number;
    icon: React.ReactNode;
}

const processSteps: ProcessStep[] = [
    {
        id: 1,
        key: "step1",
        icon: <Rocket className="w-6 h-6 text-white" />,
    },
    {
        id: 2,
        key: "step2",
        icon: <RefreshCw className="w-6 h-6 text-white" />,
    },
    {
        id: 3,
        key: "step3",
        icon: <BarChart3 className="w-6 h-6 text-white" />,
    },
];

export function HowItWorksSection() {
    const t = useTranslations("home.how_it_works");

    return (
        <section id="how-it-works" className="bg-[#faf8f5] relative z-10 pt-20 bg-gradient-to-br from-[#613171]/20 to-[#f59e0b]/20">
            <div className="mx-auto flex max-w-lg flex-col justify-between px-4 pb-20 md:mb-[6.25rem] md:max-w-lg md:pb-0 lg:mb-0 lg:w-[76rem] lg:max-w-[76rem] lg:flex-row lg:px-0 xl:max-w-[82rem] 2xl:max-w-[94rem]">
                {/* Left Column - Title and Image */}
                <div className="relative max-w-80 lg:min-h-[50rem] lg:w-[37rem]">
                    <h2 className="text-5xl text-gray-700 mb-10 font-medium sm:w-auto">
                        {t("title")}
                        <span className="text-[#613171]">.</span>
                    </h2>
                    <div className="absolute right-0 -mt-12 hidden lg:block lg:w-[38vw] 2xl:w-[545px]">
                        <Image
                            src="/images/our_process.webp"
                            alt="Our Process Illustration"
                            width={1632}
                            height={1732}
                            className="w-full"
                        />
                    </div>
                </div>

                {/* Right Column - Process Steps */}
                <div className="relative lg:w-[54rem] md:w-[32rem]">
                    <div className="relative z-10">
                        {/* Vertical Timeline Line */}
                        <div className="-z-1 border-[#613171] absolute left-[1.5rem] top-0 mt-3 h-[calc(100%+4.3rem)] border-r-2 border-dashed lg:left-[9rem] lg:h-[calc(100%+4.5rem)]" />

                        {/* Process Steps */}
                        {processSteps.map((step) => (
                            <div key={step.id} className="relative mb-14 flex lg:pl-[120px]">
                                <div className="relative mt-[10px] flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#613171] to-[#f59e0b] text-white">
                                    {step.icon}
                                </div>
                                <div className="ml-5 inline-block w-[calc(100%-68px)] align-top md:ml-6 lg:w-[520px] md:w-[440px]">
                                    <span className="text-sm font-medium text-gray-400 mb-2 uppercase">
                                        step {step.id}
                                    </span>
                                    <h3 className="text-lg text-gray-800 mb-2 font-medium">
                                        {t(`${step.key}.title`)}
                                    </h3>
                                    <p className="text-base text-gray-600">
                                        {t(`${step.key}.description`)}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Call to Action */}
                        <div className="relative float-left">
                            <div className="-z-1 absolute ml-6 mt-6 w-16 border-[#613171] border-t-2 border-dashed lg:ml-36 lg:mt-7" />
                            <div className="relative ml-[4.5rem] lg:ml-48">
                                <Link
                                    href="/demo"
                                    className="inline-flex items-center rounded-lg bg-[#613171] px-6 py-3 text-lg font-semibold text-white hover:bg-[#4e2759] transition-colors"
                                >
                                    {t("cta")}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
