"use client";
import React, { useEffect, useState, useRef } from "react";

import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

import { WebContainer } from "@webcontainer/api";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";

interface WebContainerPreviewProps {
  templateData: TemplateFolder;
  serverUrl: string;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  forceResetup?: boolean; // Optional prop to force re-setup
}
const WebContainerPreview = ({
    templateData,
    error,
    instance,
    isLoading,
    serverUrl,
    writeFileSync,
    forceResetup = false
}: WebContainerPreviewProps) => {
    const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loadingState, setLoadingState] = useState({
    transforming: false,
    mounting: false,
    installing: false,
    starting: false,
    ready: false,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);


  useEffect(()=>{
    async function setupWebContainer() {
      if (!instance || isSetupComplete || isSetupInProgress) return;

      try{
        setIsSetupInProgress(true);
        setSetupError(null);

        try{
          const packageJsonExists = await instance.fs.readFile("package.json","utf8")

          if(packageJsonExists){
            // TODO: Implaement terminal logic here

            instance.on("server-ready", (port: number, url: string) => {

              setPreviewUrl(url);
              setLoadingState((prev) => ({
                ...prev,
                starting: false,
                ready: true,
              }));
            });
            setCurrentStep(4);
            setLoadingState((prev) => ({ ...prev, starting: true }));
            return;
          }
        }catch(err){

        }

        setLoadingState((prev) => ({ ...prev, transforming: true }));
        setCurrentStep(1);
        // Todo terminal logic


        // @ts-ignore
        const files = transformToWebContainerFormat(templateData);
        setLoadingState((prev) => ({
          ...prev,
          transforming: false,
          mounting: true,
        }));
        setCurrentStep(2);

        // step2 mount files

        // todo terminal logic

        await instance.mount(files);

        //todo terminal logic

        setLoadingState((prev) => ({
          ...prev,
          mounting: false,
          installing: true,
        }));
        setCurrentStep(3);
        // step3 install dependencies
        // todo terminal logic

        const installProcess = await instance.spawn("npm", ["install"]);

        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              //todo terminal logic
            },
          })
        );

        const installExitCode = await installProcess.exit;

        if (installExitCode !== 0) {
          throw new Error(
            `Failed to install dependencies. Exit code: ${installExitCode}`
          );
        }

        // todo terminal logic

        setLoadingState((prev) => ({
          ...prev,
          installing: false,
          starting: true,
        }));
        setCurrentStep(4);
        // step4 start server


        // todo terminal logic



        const startProcess = await instance.spawn("npm", ["run", "start"]);

        instance.on("server-ready", (port: number, url: string) => {
          //todo terminal logic


          setPreviewUrl(url);
          setLoadingState((prev) => ({
            ...prev,
            starting: false,
            ready: true,
          }));
          setIsSetupComplete(true);
          setIsSetupInProgress(false);
        });
        // Handle start process output - stream to terminal
        startProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              //todo terminal logic
            },
          })
        );

      }catch(err){
        console.error("Error setting up container:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        // todo terminal logic to print error
        setSetupError(errorMessage);
        setIsSetupInProgress(false);
        setLoadingState({
          transforming: false,
          mounting: false,
          installing: false,
          starting: false,
          ready: false,
        });
      }
    }

    setupWebContainer();
    
  },[instance, templateData, isSetupComplete, isSetupInProgress]);

  useEffect(() => {
    return () => {};
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 rounded-lg bg-gray-50 dark:bg-gray-900">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h3 className="text-lg font-medium">Initializing WebContainer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Setting up the environment for your project...
          </p>
        </div>
      </div>
    );
  }


  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (stepIndex === currentStep) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    } else {
      return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepText = (stepIndex: number, label: string) => {
    const isActive = stepIndex === currentStep;
    const isComplete = stepIndex < currentStep;

    return (
      <span
        className={`text-sm font-medium ${
          isComplete
            ? "text-green-600"
            : isActive
            ? "text-blue-600"
            : "text-gray-500"
        }`}
      >
        {label}
      </span>
    );
  };
  return (
    <div className="h-full w-full flex flex-col">
      {!previewUrl ? (
        <div className="h-full flex flex-col">
          <div className="w-full max-w-md p-6 m-5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm mx-auto">
            <Progress
              value={(currentStep / totalSteps) * 100}
              className="h-2 mb-6"
            />

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                {getStepIcon(1)}
                {getStepText(1, "Transforming template data")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(2)}
                {getStepText(2, "Mounting files")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(3)}
                {getStepText(3, "Installing dependencies")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(4)}
                {getStepText(4, "Starting development server")}
              </div>
            </div>
          </div>

          {/* Terminal */}
          
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <div className="flex-1">
            <iframe
              src={previewUrl}
              className="w-full h-full border-none"
              title="WebContainer Preview"
            />
          </div>

          <div className="h-64 border-t">
            {/* <TerminalComponent
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full"
            /> */}
          </div>
        </div>
      )}
    </div>
  )
}

export default WebContainerPreview
